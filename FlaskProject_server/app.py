from flask import Flask
from flask_cors import CORS
from routes.scheduling_routes import scheduling_bp
from routes.chat_routes import chat_bp
from routes.login_routes import login_bp
import logging

# Set global logging level to WARNING (hides INFO and DEBUG)
logging.basicConfig(level=logging.WARNING)

# Optionally silence specific chatty libraries
logging.getLogger("httpx").setLevel(logging.ERROR)
logging.getLogger("pymongo").setLevel(logging.ERROR)


def create_app():
    app = Flask(__name__)
    CORS(app)  
    
    # register the routes
    app.register_blueprint(scheduling_bp)
    app.register_blueprint(login_bp)
    app.register_blueprint(chat_bp)
    
    @app.route('/')
    def index():
        return "Welcome to the privacy policy crawling and analysis system, please visit /api/docs for the API documentation"
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', debug=False, use_reloader=False)
