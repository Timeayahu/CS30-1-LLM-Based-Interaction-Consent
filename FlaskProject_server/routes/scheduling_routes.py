from flask import Blueprint, request, jsonify
from services.scheduling import Scheduling

scheduling_bp = Blueprint('scheduling', __name__)

# create the route for scheduling modules to handle a request from the frontend
@scheduling_bp.route('/api/scheduling', methods=['POST'])
def schedule_traffic():
    data = request.get_json()
    scheduling_service = Scheduling()
    result, status = scheduling_service.schedule(data)

    return jsonify(result), status 
