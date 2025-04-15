import pymongo

username = 'cs30admin'
password = 'cs30_123456'
cluster_endpoint = 'cs30-1-docdbcluster.cluster-c5m0iqmyku0l.us-east-1.docdb.amazonaws.com'

connection_string = f'mongodb://cs30admin:{password}@cs30-1-docdbcluster.cluster-c5m0iqmyku0l.us-east-1.docdb.amazonaws.com:27017/?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false'

client = pymongo.MongoClient(connection_string)

# Test the connection
try:
    client.admin.command('ismaster')
    print("Successfully connected to DocumentDB")
except Exception as e:
    print(f"Unable to connect to DocumentDB: {e}")

# Close the connection
client.close()
