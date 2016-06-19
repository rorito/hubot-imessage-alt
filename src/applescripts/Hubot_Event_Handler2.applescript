(* WIP from the mac mini, trying to solve issues with sending and receiving from group chats *)

using terms from application "Messages"

	on message received theMessage from theBuddy for theChat
		set qMessage to quoted form of theMessage
		set qHandle to quoted form of (handle of theBuddy as string)

		(* display dialog "message: " & qHandle & " " & qMessage & " " *)

		set qScript to quoted form of "/Users/rory/test-gtbot/hubot-imessage-deploy/node_modules/hubot-imessage/src/messageReceiver.coffee"

		if (first name of theBuddy) is missing value then
			set qName to quoted form of ""
		else
			set qName to quoted form of (first name of theBuddy as string)
		end if

		do shell script "export PATH=/bin:/usr/bin:/usr/sbin:/sbin:/usr/local/bin && " & qScript & " " & qHandle & " " & qMessage & " " & qName
	end message received

	on chat room message received theMessage from theBuddy for theChat
		set qMessage to quoted form of theMessage
		set qHandle to quoted form of (handle of theBuddy as string)

		set qScript to quoted form of "/Users/rory/test-gtbot/hubot-imessage-deploy/node_modules/hubot-imessage/src/messageReceiver.coffee"

		if (first name of theBuddy) is missing value then
			set qName to quoted form of ""
		else
			set qName to quoted form of (first name of theBuddy as string)
		end if

		do shell script "export PATH=/bin:/usr/bin:/usr/sbin:/sbin:/usr/local/bin && " & qScript & " " & qHandle & " " & qMessage & " " & qName

	end chat room message received

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

	on active chat message received theMessage
		set qMessage to quoted form of theMessage
		(* set qHandle to quoted form of (handle of theBuddy as string) *)

		(* display dialog "active chat room msg recieved: " & qMessage & " " *)
	end active chat message received

	on addressed chat room message received theMessage from theBuddy for theChat
		set qMessage to quoted form of theMessage
		set qHandle to quoted form of (handle of theBuddy as string)

		display dialog "addressed chat room msg recieved: " & qHandle & " " & qMessage & " "
	end addressed chat room message received

	on addressed message received theMessage from theBuddy for theChat
		set qMessage to quoted form of theMessage
		set qHandle to quoted form of (handle of theBuddy as string)

		display dialog "addressed message received: " & qHandle & " " & qMessage & " "
	end addressed message received

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