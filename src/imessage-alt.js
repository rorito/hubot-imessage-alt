// Generated by CoffeeScript 1.10.0, which is why some of the JS looks weird
(function () {
    // Polyfills
    if (!String.prototype.startsWith) {
        String.prototype.startsWith = function (searchString, position) {
            position = position || 0;
            return this.substr(position, searchString.length) === searchString;
        };
    }

    if (!String.prototype.includes) {
        String.prototype.includes = function (search, start) {
            'use strict';
            if (typeof start !== 'number') {
                start = 0;
            }

            if (start + search.length > this.length) {
                return false;
            } else {
                return this.indexOf(search, start) !== -1;
            }
        };
    }

    if (!Array.prototype.includes) {
        Array.prototype.includes = function (searchElement /*, fromIndex*/) {
            'use strict';
            var O = Object(this);
            var len = parseInt(O.length, 10) || 0;
            if (len === 0) {
                return false;
            }
            var n = parseInt(arguments[1], 10) || 0;
            var k;
            if (n >= 0) {
                k = n;
            } else {
                k = len + n;
                if (k < 0) {
                    k = 0;
                }
            }
            var currentElement;
            while (k < len) {
                currentElement = O[k];
                if (searchElement === currentElement) { // NaN !== NaN
                    return true;
                }
                k++;
            }
            return false;
        };
    }
    // end polyfills

    var Adapter, AppleScript, Message, Pubsub, Redis, Response, Robot, TextMessage, User, iMessageAdapter, path, ref,
        extend = function (child, parent) {
            for (var key in parent) {
                if (hasProp.call(parent, key)) child[key] = parent[key];
            }
            function ctor() {
                this.constructor = child;
            }

            ctor.prototype = parent.prototype;
            child.prototype = new ctor();
            child.__super__ = parent.prototype;
            return child;
        },
        hasProp = {}.hasOwnProperty,
        slice = [].slice,
        indexOf = [].indexOf || function (item) {
                for (var i = 0, l = this.length; i < l; i++) {
                    if (i in this && this[i] === item) return i;
                }
                return -1;
            };

    ref = require('hubot'), User = ref.User, Robot = ref.Robot, Adapter = ref.Adapter, Message = ref.Message, TextMessage = ref.TextMessage, Response = ref.Response;

    AppleScript = require('applescript');

    path = require('path');

    Redis = require('redis');

    Pubsub = Redis.createClient();

    Pubsub.subscribe('hubot:incoming-imessage');

    var sqlite3 = require('sqlite3').verbose();

    var imessagemodule = require('iMessageModule');

    var dir = process.env.HOME + '/Library/Messages/';
    var file = process.env.HOME + '/Library/Messages/chat.db';
    var child_process = require('child_process');

    var main_chat_title = '';

    // discover if we are running and old version of OS X or not
    var OLD_OSX = false;
    var os = require('os');
    if (os.release().split('.')[0] === "12") { // 12 is 10.8 Mountain Lion, which does not have named group chats
        OLD_OSX = true;
    }

    // discover whether the keyboard setting "Full Keyboard Access" is set to
    // "Text boxes and lists only" -- error or 1 or less
    // "All controls" (takes 2 tabs instead of one switching between elements in Messages.app) -- 2 or more
    var FULL_KEYBOARD_ACCESS = false; // false for text boxes and lists, true for all controls

    // It seems OSX 10.11 and higher needs to use defaults read -g AppleKeyboardUIMode
    var detectAppleKeyboardUIMode = "";
    if (parseInt(os.release().split('.')[0]) >= 15) {
        detectAppleKeyboardUIMode = 'defaults read -g AppleKeyboardUIMode';
    } else {
        detectAppleKeyboardUIMode = 'defaults read NSGlobalDomain AppleKeyboardUIMode';
    }

    child_process.exec(detectAppleKeyboardUIMode, function (err, stdout, stderr) {
        if (err instanceof Error) {
            // return because we already have false set and error means text boxes and lists only
            return;
        }

        console.log("AppleKeyboardUIMode: ", stdout);

        //stdout can return the text error
        // The domain/default pair of (kCFPreferencesAnyApplication, AppleKeyboardUIMode) does not exist
        // This can be resolved by editing System Preferences. For older Mac systems select the Language and Text icon and add US English to the Languages list using the check box. For newer systems select the Language and Region icon and add English to the list, making it the primary language.

        if (parseInt(stdout) > 1) {
            FULL_KEYBOARD_ACCESS = true;
        }
    });

    // read the Messages.app sqlite db
    var db = new sqlite3.Database(file);

    // internally used variables
    var LAST_SEEN_ID = 0;
    var ENABLE_OTHER_SERVICES = false;
    var sending = false;


    //parse the list of group texts from an environment variable
    var GROUP_TEXTS = JSON.parse(process.env.MESSAGES_GROUP_TEXT_IDS);

    console.log("Parse chat_identifiers and group texts from env vars: ", GROUP_TEXTS);

    function sendMessage(to, message, groupChat) {
        imessagemodule.sendMessage(to, message);
    }

    function sendMessageGT(to, message) {
        AppleScript.execFile(__dirname + '/applescripts/test_send_to_group_text.scpt', [to, message], function (err) {
            console.log(err);
        }.bind(this));
    }

    iMessageAdapter = (function (superClass) {
        extend(iMessageAdapter, superClass);

        function iMessageAdapter(robot) {
            this.robot = robot;
        }

        iMessageAdapter.prototype.checkMessageText = function (messageId) {
            var SQL = "SELECT DISTINCT message.ROWID, handle.id, message.text, message.is_from_me, message.date, message.date_delivered, message.date_read, chat.chat_identifier, chat.display_name FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.service = 'iMessage' AND message.ROWID = " + messageId + " ORDER BY message.date DESC LIMIT 500";
            if (OLD_OSX) {
                SQL = "SELECT DISTINCT message.ROWID, handle.id, message.text, message.is_from_me, message.date, message.date_delivered, message.date_read FROM message LEFT OUTER JOIN chat LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.service = 'iMessage' AND message.ROWID = " + messageId + " ORDER BY message.date DESC LIMIT 500";
            }
            var imAdapter = this;

            db.serialize(function () {
                var arr = [];
                db.all(SQL, function (err, rows) {
                    if (err) throw err;
                    // should only be one result since we are selecting by id but I am looping anyways
                    for (var i = 0; i < rows.length; i++) {
                        var row = rows[i];
                        console.log(row);
                        if (row.is_from_me || !row || !row.text) {
                            return;
                        }

                        var chatter;
                        var isGroupChat = false;

                        console.log("arr : ", arr);
                        console.log("row.chat_identifier: ", row.chat_identifier);

                        if (row.chat_identifier === null) {
                            console.log("row.chat_identifier was null, setting to: ", row.id);
                            chatter = row.id;
                        } else if (!arr.includes(row.chat_identifier) && !arr.includes(row.display_name + '-' + row.chat_identifier)) {
                            console.log("** is chat identifier");
                            if (row.chat_identifier.includes('chat')) {
                                console.log("** is chat identifier2", row.chat_identifier);
                                console.log("row.display_name: ", row.display_name);

                                if (row.display_name && row.display_name !== "" && typeof(row.display_name) !== "undefined" || OLD_OSX) {
                                    console.log("** displayname: ", row.display_name);
                                    chatter = row.display_name;
                                    isGroupChat = true;
                                } else if (row.chat_identifier) {
                                    // There's no display_name, but we still have a chat identifier
                                    chatter = row.chat_identifier;
                                }
                            } else {
                                console.log("** else - chat identifier");
                                if (row.chat_identifier && row.chat_identifier !== "" && typeof(row.chat_identifier) !== "undefined") {
                                    console.log("** else - chat identifier, not undefined");
                                    chatter = row.chat_identifier;
                                    isGroupChat = true;
                                }
                            }
                        } else {
                            console.log("row.chat_identifier was null, unhanded state");
                        }

                        var message = row.text;

                        console.log("message: ", message);
                        console.log("iMessage user: ", chatter);

                        if (message && chatter) {
                            imAdapter.receive(new TextMessage(chatter, message));
                        } else {
                            console.error("Didn't send because of problem with message or user", chatter, message);
                        }

                        // could be used to clear applescript errors, parse message for "gtbot clear" or something like that
                        // applescript.execFile(__dirname + '/applescripts/send_return.AppleScript', [], function(err, result) {});
                    }
                });
            });
        };

        iMessageAdapter.prototype.send = function () {
            console.log("iMessageAdapter.send");
            var envelope, i, len, message, strings, user;
            envelope = arguments[0], strings = 2 <= arguments.length ? slice.call(arguments, 1) : [];
            user = envelope.user.id;

            console.log("envelope: ", envelope);
            console.log("envelope.user: ", envelope.user);
            console.log("envelope.user.id: ", user);

            //this is a hack
            if (envelope.user.startsWith("chat")) {
                //see if the chat identifier is a key in the GROUP_TEXTS JSON object we got from an env var
                if (envelope.user in GROUP_TEXTS) {
                    var gt_users_string = GROUP_TEXTS[envelope.user].join(",");

                    for (i = 0, len = strings.length; i < len; i++) {
                        sendMessageGT(gt_users_string, strings[i]);
                    }
                } else {
                    console.log("Found a chat identifier, but couldn't find a corresponding Group Text in env vars");
                }
            } else {
                for (i = 0, len = strings.length; i < len; i++) {
                    sendMessage(envelope.user, strings[i]);
                }
            }
        };

        iMessageAdapter.prototype.reply = function () {
            console.log("iMessageAdapter: reply");
            var envelope, strings;
            envelope = arguments[0], strings = 2 <= arguments.length ? slice.call(arguments, 1) : [];
            return this.send.apply(this, [envelope].concat(slice.call(strings)));
        };

        // Use setInterval to continually check iMessage for new messages every 3 seconds
        iMessageAdapter.prototype.run = function () {
            //this.allowedUsers = process.env.HUBOT_IMESSAGE_HANDLES.split(',');
            Pubsub.on('message', (function (_this) {
                return function (channel, dataString) {
                    var data, msg, ref1, user;
                    data = JSON.parse(dataString);
                    //if (ref1 = data.userId, indexOf.call(_this.allowedUsers, ref1) >= 0) {
                    if ('userId' in data) {
                        user = _this.robot.brain.userForId(data.userId);    
                    }
                    
                    user.name = data.name;
                    user.room = 'iMessage';
                    msg = ("" + data.message).replace("Gtbot", "gtbot");
                    console.log("run: ", msg, data.name);

                    //return _this.receive(new TextMessage(user, msg));
                    //} else {
                    //    return _this.robot.logger.info('Ignoring message from unauthorized iMessage user ' + data.userId);
                    //}
                };
            })(this));

            return this.emit('connected');
        };

        return iMessageAdapter;

    })(Adapter);

    exports.use = function (robot) {
        return new iMessageAdapter(robot);
    };

}).call(this);

//# sourceMappingURL=imessage.js.map
