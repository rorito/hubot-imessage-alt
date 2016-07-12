import os, sys, time
from os.path import expanduser
import apsw
import json
import redis

###
### Check we have the expected version of apsw and sqlite
###
# print "      Using APSW file",apsw.__file__                # from the extension module
# print "         APSW version",apsw.apswversion()           # from the extension module
# print "   SQLite lib version",apsw.sqlitelibversion()      # from the sqlite library code
# print "SQLite header version",apsw.SQLITE_VERSION_NUMBER   # from the sqlite header file at compile time

chat_db = os.path.join(expanduser("~"), 'Library/Messages/chat.db')

print "path to iMessage sqlite db: " + chat_db


def getSenderInfoSQLQuery(messageID):
	return "SELECT DISTINCT message.ROWID, handle.id, message.text, message.is_from_me, message.date, message.date_delivered, message.date_read, chat.chat_identifier, chat.display_name FROM message LEFT OUTER JOIN chat ON chat.room_name = message.cache_roomnames LEFT OUTER JOIN handle ON handle.ROWID = message.handle_id WHERE message.service = 'iMessage' AND message.ROWID = " + str(messageID) + " ORDER BY message.date DESC LIMIT 500"


connection=apsw.Connection(chat_db)
cursor=connection.cursor()

###
### update hook
###
# Hmm, not working
def myupdatehook(type, databasename, tablename, rowid):
    print "Updated: %s database %s, table %s, row %d" % (
        apsw.mapping_authorizer_function[type], databasename, tablename, rowid)

connection.setupdatehook(myupdatehook)


max_id_query = "SELECT MAX(ROWID) AS max FROM message"
redis_channel = "hubot:incoming-imessage"
LAST_SEEN_ID = 0

# setup redis connection
r = redis.StrictRedis(host='localhost', port=6379, db=0)
pubsub = r.pubsub()

# Initially check for the last_seen_id
for row in cursor.execute(max_id_query):
   		if row[0] > LAST_SEEN_ID:
   			LAST_SEEN_ID = row[0]
   			print "LAST_SEEN_ID: " + str(row[0])

# loop until termination
while True: 
	time.sleep(0.3)
	for row in cursor.execute("SELECT text, cache_roomnames FROM message WHERE ROWID > {} ORDER BY ROWID ASC;".format(LAST_SEEN_ID)):
		# TODO check for sending?

		message = ""
		sender_or_chat_identifier = ""

		if len(row) >= 2:
			message = row[0]
			sender_or_chat_identifier = row[1]

			# if sender is None, it was from an individual user, not a group text
			if not sender_or_chat_identifier:
				for row in cursor.execute(getSenderInfoSQLQuery(LAST_SEEN_ID)):
					print "** ran join query"
					if len(row) >= 7:
						sender_or_chat_identifier = row[7]

		LAST_SEEN_ID += 1
		
		print "Message: " + str(LAST_SEEN_ID) + "-" + str(sender_or_chat_identifier) + "-" + message
		
		r.publish(
			redis_channel, 
			json.dumps({
				"name": sender_or_chat_identifier,
				"message": message,
				"userId": sender_or_chat_identifier
			})
		)				
		