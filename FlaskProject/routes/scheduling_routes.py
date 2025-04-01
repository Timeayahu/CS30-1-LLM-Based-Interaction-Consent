from flask import Blueprint, request, jsonify
from services.scheduling import Scheduling

scheduling_bp = Blueprint('scheduling', __name__)
scheduling_service = Scheduling()

@scheduling_bp.route('/api/scheduling', methods=['POST'])
def schedule_traffic():
    data = request.get_json()
    scheduling_service.crawler(data)
    result, status = scheduling_service.schedule()

    return jsonify(result), status 