from flask import Blueprint, request, jsonify
from services.scheduling import Scheduling

scheduling_bp = Blueprint('scheduling', __name__)
scheduling_service = Scheduling()

@scheduling_bp.route('/api/scheduling', methods=['POST'])
def schedule_traffic():
    data = request.get_json()
    result, status = scheduling_service.schedule(data)

    return jsonify(result), status 