from flask import Flask
from flask_cors import CORS
from routes.crawler_routes import crawler_bp



def create_app():
    app = Flask(__name__)
    CORS(app)  
    
  
    #app.register_blueprint(privacy_bp)
    app.register_blueprint(crawler_bp)
    
    @app.route('/')
    def index():
        return "welcome to use privacy policy crawler and analysis system, API documentation please visit /api/docs"
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=8001, debug=False, use_reloader=False)
