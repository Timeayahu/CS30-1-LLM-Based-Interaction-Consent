from flask import Blueprint, request, jsonify
from services.scheduling.service_local import Scheduling

scheduling_local_bp = Blueprint('scheduling_local', __name__)
scheduling_local_service = Scheduling()

@scheduling_local_bp.route('/api/scheduling/local', methods=['POST'])
def schedule_local_traffic():
    data = request.get_json()
    result, status = scheduling_local_service.schedule(data)

    return jsonify(result), status
