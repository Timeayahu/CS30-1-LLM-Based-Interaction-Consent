from flask import Flask
from flask_cors import CORS
from routes.privacy_routes import privacy_bp
from routes.crawler_routes import crawler_bp
from routes.scheduling_routes import scheduling_bp


def create_app():
    app = Flask(__name__)
    CORS(app)  
    
    # 注册路由
    app.register_blueprint(privacy_bp)
    app.register_blueprint(crawler_bp)
    app.register_blueprint(scheduling_bp)
    
    @app.route('/')
    def index():
        return "欢迎使用隐私政策爬取和分析系统，API文档请访问/api/docs"
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
