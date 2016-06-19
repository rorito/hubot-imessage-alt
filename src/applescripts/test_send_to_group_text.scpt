on theSplit(theString, theDelimiter)
-- save delimiters to restore old settings
  set oldDelimiters to AppleScript's text item delimiters
  -- set delimiters to delimiter to be used
  set AppleScript's text item delimiters to theDelimiter
  -- create the array
  set theArray to every text item of theString
  -- restore the old setting
  set AppleScript's text item delimiters to oldDelimiters
  -- return the result
  return theArray
end theSplit


on run argv
  tell application "Messages"

    activate

    (* the list of participants we will pass to the text chat in iMessage *)
    set participants_list to {}

    (* the first argument of argv is a comma seperated list of the phone numbers and email addresses that make up the group chat *)
    set contact_info_list to my theSplit(item 1 of argv, ",")

    (* TODO need to handle the case of only one item in the contact_info_list with no comma *)

    (* for each phone / email, create a iMessage buddy and add it to the participants list *)
    repeat with phoneOrEmail in contact_info_list
      set imessageBuddy to buddy phoneOrEmail of (service 1 whose service type is iMessage)
      set end of participants_list to imessageBuddy
    end repeat

    set thisChat to make new text chat with properties {participants: participants_list}
    set thisMessage to send item 2 of argv to thisChat

  end tell
end run