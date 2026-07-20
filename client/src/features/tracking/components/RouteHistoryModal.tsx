import React, { useEffect, useState } from 'react';
import { Dialog } from '../../../components/ui/dialog';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import api from '../../../config/api';
import { Clock } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

interface RouteHistoryModalProps {
  dutySessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

// Custom Leaflet Icons for Start and End Points
const startIcon = L.divIcon({
  className: 'custom-start-marker',
  html: `<div style="background: #10b981; color: white; padding: 4px 8px; border-radius: 9999px; font-weight: bold; font-size: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.4);">START</div>`,
  iconSize: [40, 20],
  iconAnchor: [20, 10]
});

const endIcon = L.divIcon({
  className: 'custom-end-marker',
  html: `<div style="background: #ef4444; color: white; padding: 4px 8px; border-radius: 9999px; font-weight: bold; font-size: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.4);">END</div>`,
  iconSize: [40, 20],
  iconAnchor: [20, 10]
});

export const RouteHistoryModal: React.FC<RouteHistoryModalProps> = ({
  dutySessionId,
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tracking/history/${dutySessionId}`);
      setSession(res.data.data.session);
      setLocations(res.data.data.locations || []);
      setTimeline(res.data.data.timeline || []);
    } catch (err) {
      console.error('Failed to load duty session route history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dutySessionId && isOpen) {
      fetchHistory();
    }
  }, [dutySessionId, isOpen]);

  const polylinePositions: [number, number][] = locations.map(loc => [loc.latitude, loc.longitude]);
  const centerPos: [number, number] = polylinePositions.length > 0 ? polylinePositions[0] : [25.5941, 85.1376];

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Route History & Movement Timeline">
      <div className="space-y-4 pt-2">
        {loading ? (
          <p className="text-xs text-slate-500 italic p-6 text-center">Loading recorded GPS route path...</p>
        ) : !session ? (
          <p className="text-xs text-red-400 p-6 text-center">Duty session details unavailable.</p>
        ) : (
          <>
            {/* Session Header Card */}
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col md:flex-row justify-between md:items-center gap-3 text-xs">
              <div>
                <p className="font-bold text-slate-200">
                  {session.staffId ? `${session.staffId.firstName} ${session.staffId.lastName}` : 'Courier Staff'}
                </p>
                <p className="text-slate-500 font-mono text-[10px]">
                  Branch: {session.branchId?.name} | ID: {session.staffId?.employeeId}
                </p>
              </div>

              <div className="flex items-center space-x-3 text-slate-300 font-mono">
                <div>
                  <span className="text-slate-500 font-bold">DISTANCE:</span>
                  <p className="text-emerald-400 font-bold">{session.totalDistanceKm ? session.totalDistanceKm.toFixed(2) : 0} km</p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">WAYPOINTS:</span>
                  <p className="text-indigo-400 font-bold">{locations.length}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold">STATUS:</span>
                  <Badge variant={session.status === 'ON_DUTY' ? 'success' : 'secondary'} className="ml-1 text-[9px]">
                    {session.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Split View: Left Map Polyline, Right Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Map */}
              <div className="h-[340px] rounded-lg overflow-hidden border border-slate-800 relative z-0">
                {polylinePositions.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500 italic bg-slate-950 p-4 text-center">
                    No GPS waypoints recorded for this session yet.
                  </div>
                ) : (
                  <MapContainer
                    center={centerPos}
                    zoom={14}
                    scrollWheelZoom={true}
                    style={{ height: '100%', width: '100%', background: '#090d16' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <Polyline positions={polylinePositions} color="#6366f1" weight={4} opacity={0.8} />

                    {/* Start Marker */}
                    {polylinePositions.length > 0 && (
                      <Marker position={polylinePositions[0]} icon={startIcon}>
                        <Popup className="custom-popup">
                          <div className="text-xs font-bold text-slate-900">
                            Start Duty ({new Date(locations[0].timestamp).toLocaleTimeString()})
                          </div>
                        </Popup>
                      </Marker>
                    )}

                    {/* End Marker */}
                    {polylinePositions.length > 1 && (
                      <Marker position={polylinePositions[polylinePositions.length - 1]} icon={endIcon}>
                        <Popup className="custom-popup">
                          <div className="text-xs font-bold text-slate-900">
                            Latest Position ({new Date(locations[locations.length - 1].timestamp).toLocaleTimeString()})
                          </div>
                        </Popup>
                      </Marker>
                    )}
                  </MapContainer>
                )}
              </div>

              {/* Movement Timeline */}
              <div className="h-[340px] overflow-y-auto p-3 bg-slate-950/40 border border-slate-800 rounded-lg space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center space-x-1.5">
                  <Clock className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Movement Timeline</span>
                </p>

                {timeline.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 text-center">No timeline events recorded.</p>
                ) : (
                  <div className="relative pl-4 space-y-3 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                    {timeline.map((event, idx) => (
                      <div key={idx} className="relative flex items-start space-x-2 text-xs">
                        <div className="absolute -left-4 top-1 h-2.5 w-2.5 rounded-full bg-indigo-500 ring-4 ring-slate-950" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-200">{event.title}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(event.time).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-slate-400 text-[11px] mt-0.5">{event.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
};
