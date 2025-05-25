from flask import Flask
from flask_cors import CORS
# from routes.privacy_routes import privacy_bp
from routes.crawler_routes import crawler_bp
from routes.scheduling_routes import scheduling_bp
from routes.chat_routes import chat_bp


from routes.chat_routes import chat_bp
from routes.scheduling_local_routes import scheduling_local_bp


def create_app():
    app = Flask(__name__)
    CORS(app)  
    

    #app.register_blueprint(privacy_bp)
    app.register_blueprint(crawler_bp)
    app.register_blueprint(scheduling_bp)

    app.register_blueprint(chat_bp)  
    app.register_blueprint(scheduling_local_bp)
    
    @app.route('/')
    def index():
        return "Welcome to the privacy policy crawler and analysis system, please visit /api/docs for the API documentation"
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', debug=False, use_reloader=False)
