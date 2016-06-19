tell application "Messages"

  activate

  set buddy1 to buddy "(* phone number *)" of (service 1 whose service type is iMessage)
  set buddy2 to buddy "(* phone number *)" of (service 1 whose service type is iMessage)
  set buddy3 to buddy "(* phone number *)" of (service 1 whose service type is iMessage)
  set buddy4 to buddy "(* phone number *)" of (service 1 whose service type is iMessage)
  set buddy5 to buddy "(* email *)" of (service 1 whose service type is iMessage)

  set thisChat to make new text chat with properties {participants:{buddy1, buddy2, buddy3, buddy4, buddy5}}
  set thisMessage to send "test message" to thisChat

end tell