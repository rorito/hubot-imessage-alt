var sqlite3 = require('sqlite3').verbose();
var fs = require("fs");
var dir = process.env.HOME + '/Library/Messages/';
var file = process.env.HOME + '/Library/Messages/chat.db';
var exec = require('exec');

var main_chat_title = '';

var exists = fs.existsSync(file);
if (!exists) {
    return;
}

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
exec('defaults read NSGlobalDomain AppleKeyboardUIMode', function(err, out, code) {
    if (err instanceof Error) {
        // return because we already have false set and error means text boxes and lists only
        return;
    }

    if (parseInt(out) > 1) {
        FULL_KEYBOARD_ACCESS = true;
    }
});

// read the Messages.app sqlite db
var db = new sqlite3.Database(file);

// internally used variables
var LAST_SEEN_ID = 0;
var ENABLE_OTHER_SERVICES = false;
var sending = false;

function sendiMessage(rowText, chatter, isGroupChat) {
    var text = rowText.substring(3);
    var sendTo = text.split(' ')[0];
    text = rowText.substring(sendTo.length + 4);
    sendMessage(sendTo, chatter + " says: " + text, true);
    setTimeout(function() {
        console.log(chatter, "sent: " + text + " to: " + sendTo);
        sendMessage(chatter, "sent: " + text + " to: " + sendTo, isGroupChat);
    }.bind(this), 3000);
}

function getLatestImage(chatter, callback) {
    var sql = 'SELECT attachment.filename as filename FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id LEFT OUTER JOIN message_attachment_join ON message_attachment_join.message_id = message.ROWID LEFT OUTER JOIN attachment ON attachment.ROWID = message_attachment_join.attachment_id WHERE chat.display_name = \'' + chatter + '\' AND attachment.filename IS NOT NULL ORDER BY message.date DESC LIMIT 1';
    db.serialize(function() {
        db.all(sql, function(err, rows) {
            if (rows) {
                console.log(rows);
                callback(rows[0].filename);

            }
        }.bind(this));
    }.bind(this));
}

function URLLookup(rowText, chatter, isGroupChat) {
    var protocol = "http";
    var index = rowText.indexOf('http://');
    if (index === -1) {
        index = rowText.indexOf('https://');
        protocol = "https";
    }

    var url = rowText.split(protocol + '://')[1]; // get everything after the protocol
    console.log(url);

    var htp = {};
    if (protocol === 'http') {
        htp = require('follow-redirects').http;
    } else {
        htp = require('follow-redirects').https;
    }

    var path = "";
    for (var i = 1; i < url.split('/').length; i++) {
        var temp = url.split('/')[i];
        if (temp.indexOf(' ') > -1) {
            temp = temp.split(' ')[0];
        }

        path += '/' + temp;
    }

    var options = {
        host: ((url.indexOf('/') > -1) ? url.split('/')[0] : url.split(' ')[0]), // host is everything before first /
        path: path // path is everything after, plus opening /
    };

    console.log(options);

    var callback = function(response) {
        var documentText = '';
        response.on('data', function (chunk) {
            documentText += chunk;
        });

        response.on('end', function () {
            var regex = /<title>(.+?)<\/title>/igm;
            var title = regex.exec(documentText);
            if (!title) {
                title = [];
                title[1] = "no title";
            }

            console.log(chatter, "url: " + protocol + '://' + url.split('/')[0] + path + " title: " + title[1]);
            sendMessage(chatter, "url: " + protocol + '://' + url.split('/')[0] + path + " title: " + title[1], isGroupChat);
        });
    };

    var request = htp.request(options, callback);

    request.on('error', function (error) {
        console.log(chatter, "url: " + protocol + '://' + url.split('/')[0] + path + " error");
        sendMessage(chatter, "url: " + protocol + '://' + url.split('/')[0] + path + " error", isGroupChat);
    });

    request.end();
}

function checkMessageText(messageId) {
    var SQL = "SELECT DISTINCT message.ROWID, handle.id, message.text, message.is_from_me, message.date, message.date_delivered, message.date_read, chat.chat_identifier, chat.display_name FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.service = 'iMessage' AND message.ROWID = " + messageId + " ORDER BY message.date DESC LIMIT 500";
    if (OLD_OSX) {
        SQL = "SELECT DISTINCT message.ROWID, handle.id, message.text, message.is_from_me, message.date, message.date_delivered, message.date_read FROM message LEFT OUTER JOIN chat LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.service = 'iMessage' AND message.ROWID = " + messageId + " ORDER BY message.date DESC LIMIT 500";
    }

    db.serialize(function() {
        var arr = [];
        db.all(SQL, function(err, rows) {
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
                if (row.chat_identifier === null) {
                    chatter = row.id;
                } else if (arr.indexOf(row.chat_identifier) < 0 && arr.indexOf(row.display_name+'-'+row.chat_identifier) < 0) {
                    if (row.chat_identifier.indexOf('chat') > -1) {
                        if (row.display_name && row.display_name !== "" && typeof(row.display_name) !== "undefined" || OLD_OSX) {
                            chatter = row.display_name;
                            isGroupChat = true;
                        }
                    } else {
                        if (row.chat_identifier && row.chat_identifier !== "" && typeof(row.chat_identifier) !== "undefined") {
                            chatter = row.chat_identifier;
                            isGroupChat = true;
                        }
                    }
                }

                var rowText = row.text;
                // rowText = rowText.toLowerCase();
                if (rowText.split(' ').length < 2 && rowText.indexOf('.') === 0) {
                    console.log('dropping: ' + rowText);
                    return;
                }

                if (rowText.split(' ', 1)[0] === '.i') {
                    sendiMessage(rowText, chatter, isGroupChat);
                } else if (rowText.split(' ', 1)[0] === '.r') {
                    applescript.execFile(__dirname + '/send_return.AppleScript', [], function(err, result) {});
                } else if (rowText.indexOf('http://') > -1 || rowText.indexOf('https://') > -1) {
                    URLLookup(rowText, chatter, isGroupChat);
                }
            }
        });
    });
}

function sendMessage(to, message, groupChat) {
    imessagemodule.sendMessage(to, message);
}

db.serialize(function() {
    db.all("SELECT MAX(ROWID) AS max FROM message", function(err, rows) {
        if (rows) {
            var max = rows[0].max;
            if (max > LAST_SEEN_ID) {
                LAST_SEEN_ID = max;
                return;
            }
        }
    }.bind(this));
}.bind(this));

setInterval(function() {
    db.serialize(function() {
        db.all("SELECT MAX(ROWID) AS max FROM message", function(err, rows) {
            if (rows && !sending) {
                var max = rows[0].max;
                if (max > LAST_SEEN_ID) {
                    for (LAST_SEEN_ID; LAST_SEEN_ID <= max; LAST_SEEN_ID++) {
                        checkMessageText(LAST_SEEN_ID);
                    }
                }
            }
        }.bind(this));
    }.bind(this));
}, 3000);