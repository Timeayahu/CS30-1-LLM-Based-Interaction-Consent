from flask import Flask
from flask_cors import CORS
from routes.crawler_routes import crawler_bp


def create_app():
    app = Flask(__name__)
    CORS(app)  
    
    # register the routes
    app.register_blueprint(crawler_bp)
    
    @app.route('/')
    def index():
        return "Welcome to the privacy policy crawling and analysis system, please visit /api/docs for the API documentation"
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=8001, debug=False, use_reloader=False)
