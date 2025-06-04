from models.mongodb_ec2 import connect_to_mongodb, close_mongodb_connection

def clear_data():
    client, db, chat_sessions = connect_to_mongodb()
    if client == None:
        print("Database connection failed!")
    else:
        db['privacy_data'].delete_many({})
        db['chat_sessions'].delete_many({})
        close_mongodb_connection(client)

if __name__ == "__main__":
    clear_data()

