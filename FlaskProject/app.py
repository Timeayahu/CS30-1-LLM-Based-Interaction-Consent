from flask import Flask
from flask_cors import CORS
from routes.privacy_routes import privacy_bp
from routes.crawler_routes import crawler_bp
from routes.scheduling_routes import scheduling_bp
<<<<<<< Updated upstream
=======
from routes.chat_routes import chat_bp
from routes.scheduling_local_routes import scheduling_local_bp
>>>>>>> Stashed changes

def create_app():
    app = Flask(__name__)
    CORS(app)  
    
    # 注册路由
    app.register_blueprint(privacy_bp)
    app.register_blueprint(crawler_bp)
    app.register_blueprint(scheduling_bp)
<<<<<<< Updated upstream
=======
    app.register_blueprint(chat_bp)  # 注册聊天路由
    app.register_blueprint(scheduling_local_bp)
>>>>>>> Stashed changes
    
    @app.route('/')
    def index():
        return "欢迎使用隐私政策爬取和分析系统，API文档请访问/api/docs"
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=False, use_reloader=False)
