"use strict";

const AttendanceEngine = (() => {
    let watchId = null;
    const btnIn = document.getElementById('btn-check-in');
    const btnOut = document.getElementById('btn-check-out');
    const statusBadge = document.getElementById('duty-status');
    const statusMsg = document.getElementById('status-msg');
    const locText = document.getElementById('loc-text');
    const locCoords = document.getElementById('loc-coords');
    const liveToggle = document.getElementById('live-location-toggle');

    const init = () => {
        const user = AuthService.getCurrentUser();
        const activeDuty = StorageService.load('nsf_active_duty_' + user.id, null);

        if (activeDuty) {
            setDutyState(true);
        }

        if (btnIn) btnIn.addEventListener('click', () => markAttendance('Check In'));
        if (btnOut) btnOut.addEventListener('click', () => markAttendance('Check Out'));
        if (liveToggle) liveToggle.addEventListener('change', toggleLiveLocation);
    };

    const setDutyState = (isOn) => {
        if (isOn) {
            btnIn.style.display = 'none';
            btnOut.style.display = 'flex';
            statusBadge.textContent = 'ON DUTY';
            statusBadge.className = 'status-badge status-on';
        } else {
            btnIn.style.display = 'flex';
            btnOut.style.display = 'none';
            statusBadge.textContent = 'OFF DUTY';
            statusBadge.className = 'status-badge status-off';
        }
    };

    const markAttendance = (type) => {
        statusMsg.textContent = "Obtaining GPS location...";
        statusMsg.style.color = "#0B1F3A";

        if (!navigator.geolocation) {
            showError("Geolocation not supported");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const record = {
                    type,
                    userId: AuthService.getCurrentUser().id,
                    userName: AuthService.getCurrentUser().name,
                    client: "Tech Park Alpha",
                    site: "Main Gate",
                    shift: "Day",
                    timestamp: new Date().toISOString(),
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    status: "Verified"
                };

                saveRecord(record);

                if (type === 'Check In') {
                    StorageService.save('nsf_active_duty_' + record.userId, record);
                    setDutyState(true);
                    showSuccess("Checked in successfully!");
                } else {
                    StorageService.removeItem('nsf_active_duty_' + record.userId);
                    setDutyState(false);
                    showSuccess("Checked out successfully!");
                    if (watchId) toggleLiveLocation(); // Stop live tracking
                }

                locText.innerHTML = `<i data-lucide="check" class="icon-sm"></i> Location Verified`;
                locCoords.textContent = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)} (±${Math.round(pos.coords.accuracy)}m)`;
                lucide.createIcons();
            },
            (err) => {
                showError("GPS Error: " + err.message);
                // Trigger Alert for Admin
                saveAlert("GPS_ERROR", err.message);
            },
            { enableHighAccuracy: true }
        );
    };

    const saveRecord = (record) => {
        const history = StorageService.load('nsf_attendance_logs', []);
        history.push(record);
        StorageService.save('nsf_attendance_logs', history);
    };

    const saveAlert = (type, message) => {
        const alerts = StorageService.load('nsf_admin_alerts', []);
        alerts.push({
            type,
            message,
            userId: AuthService.getCurrentUser().id,
            userName: AuthService.getCurrentUser().name,
            timestamp: new Date().toISOString()
        });
        StorageService.save('nsf_admin_alerts', alerts);
    };

    const toggleLiveLocation = () => {
        if (liveToggle.checked) {
            if (navigator.geolocation) {
                watchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        const user = AuthService.getCurrentUser();
                        const livePos = {
                            userId: user.id,
                            userName: user.name,
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            lastUpdate: new Date().toISOString()
                        };
                        StorageService.save('nsf_live_location_' + user.id, livePos);
                        console.log("Live position updated", livePos);
                    },
                    null,
                    { enableHighAccuracy: true }
                );
            }
        } else {
            if (watchId) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
                StorageService.removeItem('nsf_live_location_' + AuthService.getCurrentUser().id);
            }
        }
    };

    const showSuccess = (msg) => {
        statusMsg.textContent = msg;
        statusMsg.style.color = "#059669";
    };

    const showError = (msg) => {
        statusMsg.textContent = msg;
        statusMsg.style.color = "#dc2626";
    };

    return { init };
})();

document.addEventListener('DOMContentLoaded', AttendanceEngine.init);
