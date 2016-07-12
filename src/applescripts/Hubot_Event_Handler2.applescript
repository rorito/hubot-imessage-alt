(* WIP from the mac mini, trying to solve issues with sending and receiving from group chats *)

on log_event(themessage, yesDo)
	if yesDo then
		set theLine to (do shell script "date +'%Y-%m-%d %H:%M:%S'" as string) & " " & themessage
		do shell script "echo " & theLine & " [code]>>[/code] ~/gtbot-applescript.log"
	end if
end log_event

using terms from application "Messages"

	property doLogTF: true

	on message received theMessage from theBuddy for theChat
		set qMessage to quoted form of theMessage
		set qHandle to quoted form of (handle of theBuddy as string)

		(* display dialog "message: " & qHandle & " " & qMessage & " " *)

		set qScript to quoted form of "/Users/rory/test-gtbot/hubot-imessage-deploy/node_modules/hubot-imessage-alt/src/messageReceiver.js"

		if (first name of theBuddy) is missing value then
			set qName to quoted form of ""
		else
			set qName to quoted form of (first name of theBuddy as string)
		end if

		do shell script "export PATH=/bin:/usr/bin:/usr/sbin:/sbin:/usr/local/bin && " & qScript & " " & qHandle & " " & qMessage & " " & qName

--		log_event("message received from the buddy for thechat: " & qHandle & " " & qMessage, doLogTF)
	end message received

	on chat room message received theMessage from theBuddy for theChat
		set qMessage to quoted form of theMessage
		set qHandle to quoted form of (handle of theBuddy as string)

		set qScript to quoted form of "/Users/rory/test-gtbot/hubot-imessage-deploy/node_modules/hubot-imessage-alt/src/messageReceiver.js"

		if (first name of theBuddy) is missing value then
			set qName to quoted form of ""
		else
			set qName to quoted form of (first name of theBuddy as string)
		end if

		do shell script "export PATH=/bin:/usr/bin:/usr/sbin:/sbin:/usr/local/bin && " & qScript & " " & qHandle & " " & qMessage & " " & qName

--		log_event("chat room message received from the buddy for thechat: " & qHandle & " " & qMessage, doLogTF)

	end chat room message received

  on active chat message received theMessage
    set qMessage to quoted form of theMessage
--    log_event("active chat room msg recieved: " & qMessage, doLogTF)
  end active chat message received

  on addressed chat room message received theMessage from theBuddy for theChat
    set qMessage to quoted form of theMessage
    set qHandle to quoted form of (handle of theBuddy as string)
--    log_event("addressed chat room msg recieved: " & qHandle & " " & qMessage, doLogTF)
  end addressed chat room message received

  on addressed message received theMessage from theBuddy for theChat
    set qMessage to quoted form of theMessage
    set qHandle to quoted form of (handle of theBuddy as string)

--    log_event("addressed message recieved: " & qHandle & " " & qMessage, doLogTF)
  end addressed message received

	-- Accept text chats but deny everything else

	on received text invitation theText from theBuddy for theChat
		accept theChat
	end received text invitation

	on buddy authorization requested theRequest
		accept theRequest
	end buddy authorization requested

	on received audio invitation theText from theBuddy for theChat
		decline theChat
	end received audio invitation

	on received video invitation theText from theBuddy for theChat
		decline theChat
	end received video invitation

	(*
	on received remote screen sharing invitation from theBuddy for theChat
		decline theChat
	end received remote screen sharing invitation

	on received local screen sharing invitation from theBuddy for theChat
		decline theChat
	end received local screen sharing invitation
	*)

	on received file transfer invitation theFileTransfer
		decline theFileTransfer
	end received file transfer invitation

	-- The following are unused but need to be defined to avoid an error

	on message sent theMessage for theChat

	end message sent

	on av chat started

	end av chat started

	on av chat ended

	end av chat ended

	on login finished for theService

	end login finished

	on logout finished for theService

	end logout finished

	on buddy became available theBuddy

	end buddy became available

	on buddy became unavailable theBuddy

	end buddy became unavailable

	on completed file transfer

	end completed file transfer

end using terms from