from flask import Flask,jsonify,request
from flask_cors import CORS
from flask_pymongo import PyMongo


# Dummy user data for demonstration
dummy_users = [
    {"email": "user1@example.com", "password": "password1"},
    {"email": "user2@example.com", "password": "password2"}
]

app   = Flask(__name__)
cors= CORS(app, origins='*')
#  Connect to MongoDB, change the connection parameters according to  setup
app.config["MONGO_URI"] = "mongodb://localhost:27017/mydatabase"
mongo = PyMongo(app)

@app.route('/api/users', methods=['GET'])
def users():
    return jsonify({"Users":["John ","Alice","Bob","Maddy"]})


@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    # Check if the email is already registered
    for user in dummy_users:
        if user['email'] == email:
            print("Email already registered", {name},{email},{password} )
            return jsonify({'error': 'Email already registered'}), 400

    # If email is not registered, add the user to the list (This is just a demonstration, in a real-world application, you would typically add the user to a database)
    dummy_users.append({'name': name, 'email': email, 'password': password})
    print("User registered successfully " , {name},{email},{password})
    return jsonify({'message': 'User registered successfully'})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    # Check if the email and password match any user in the dummy user data
    for user in dummy_users:
        if user['email'] == email and user['password'] == password:
            # If the user is found and authenticated, return a success message
            print("Login Sucess")
            return jsonify({'message': 'Login successful!'})
    
    # If the user is not found or authentication fails, return an error message
    print("Login Error")
    return jsonify({'error': 'Invalid email or password'}), 401

@app.route('/')
def index():
    # # Example: Insert document into MongoDB
    # mongo.db.collection.insert_one({'name': 'John', 'age': 30})

    # # Example: Find documents in MongoDB
    # documents = mongo.db.collection.find()

    # # Process documents as needed
    # for doc in documents:
    #     print(doc)
    
    # return 'Data inserted and fetched from MongoDB successfully!'

    print("Application Started")
    return jsonify({"Application Started" : dummy_users })

@app.teardown_appcontext
def close_db_connection(exception=None):
    mongo.cx.close()


if __name__ == "__main__":
    app.run(debug=True, port=8080)


