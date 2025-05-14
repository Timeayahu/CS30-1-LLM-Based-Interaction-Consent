import unittest
from flask import Flask
from routes.scheduling_local_routes import scheduling_local_bp
from services.scheduling.service_local import Scheduling
from unittest.mock import patch

class TestSchedulingLocalIntegration(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.register_blueprint(scheduling_local_bp)
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()

    @patch.object(Scheduling, 'schedule')
    def test_schedule_local_traffic_success(self, mock_schedule):
        mock_schedule.return_value = ({"message": "Scheduled successfully"}, 200)

        payload = {
            "url": "https://example.com/privacy",
            "force": True
        }

        response = self.client.post(
            "/api/scheduling/local",
            json=payload
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("Scheduled successfully", response.get_data(as_text=True))
        mock_schedule.assert_called_once_with(payload)

    @patch.object(Scheduling, 'schedule')
    def test_schedule_local_traffic_failure(self, mock_schedule):
        mock_schedule.return_value = ({"error": "Invalid input"}, 400)

        response = self.client.post("/api/scheduling/local", json={})

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid input", response.get_data(as_text=True))
        mock_schedule.assert_called_once_with({})

if __name__ == "__main__":
    unittest.main()
