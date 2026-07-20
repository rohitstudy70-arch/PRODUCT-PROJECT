import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Input } from '../../../components/ui/input';
import api from '../../../config/api';
import { Toaster, toast } from 'sonner';
import { MapPin, Battery, Navigation, RefreshCw, Route, Signal } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { RouteHistoryModal } from '../components/RouteHistoryModal';
import io from 'socket.io-client';

// Fix Leaflet marker icon paths in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

// Custom colored map markers
const createCustomMarkerIcon = (color: 'green' | 'yellow' | 'red') => {
  const colorHex = color === 'green' ? '#22c55e' : color === 'yellow' ? '#eab308' : '#ef4444';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${colorHex}" width="36" height="36" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.5));">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
  </svg>`;
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: svg,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -32]
  });
};

const greenIcon = createCustomMarkerIcon('green');
const yellowIcon = createCustomMarkerIcon('yellow');
const redIcon = createCustomMarkerIcon('red');

// Helper component to center map when selecting staff
const MapFlyTo: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center[0] !== 0 && center[1] !== 0) {
      map.flyTo(center, 15, { animate: true });
    }
  }, [center, map]);
  return null;
};

export const LiveTrackingPage: React.FC = () => {
  const [activeStaffList, setActiveStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([25.5941, 85.1376]); // Patna default coordinates
  const [historyModalSessionId, setHistoryModalSessionId] = useState<string | null>(null);

  const fetchActiveStaff = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tracking/active');
      setActiveStaffList(response.data.data);
      if (response.data.data.length > 0) {
        const firstWithLoc = response.data.data.find((item: any) => item.latestLocation);
        if (firstWithLoc) {
          setMapCenter([firstWithLoc.latestLocation.latitude, firstWithLoc.latestLocation.longitude]);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load live staff tracking data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveStaff();

    const socketUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
    const socket = io(socketUrl, {
      withCredentials: true
    });

    socket.on('staff_location_update', (data: any) => {
      setActiveStaffList(prevList => {
        return prevList.map(item => {
          if (item.staff._id === data.staffId) {
            return {
              ...item,
              latestLocation: {
                ...item.latestLocation,
                latitude: data.latitude,
                longitude: data.longitude,
                speed: data.speed,
                batteryLevel: data.batteryLevel,
                isInternetConnected: data.isInternetConnected,
                isGpsEnabled: data.isGpsEnabled,
                timestamp: data.timestamp
              },
              session: {
                ...item.session,
                totalDistanceKm: data.totalDistanceKm
              }
            };
          }
          return item;
        });
      });
    });

    socket.on('duty_started', () => {
      fetchActiveStaff();
    });

    socket.on('duty_ended', () => {
      fetchActiveStaff();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const filteredStaff = activeStaffList.filter(item => {
    const fullName = `${item.staff.firstName} ${item.staff.lastName}`.toLowerCase();
    const empId = (item.staff.employeeId || '').toLowerCase();
    const q = search.toLowerCase();
    return fullName.includes(q) || empId.includes(q);
  });

  const getMarkerIcon = (item: any) => {
    if (!item.latestLocation) return redIcon;
    const minutesAgo = (new Date().getTime() - new Date(item.latestLocation.timestamp).getTime()) / 60000;
    if (minutesAgo > 5) return redIcon;
    return item.latestLocation.speed > 2 ? greenIcon : yellowIcon;
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" theme="dark" closeButton />

      <PageHeader
        title="Live Staff GPS Tracking"
        subtitle="Real-time location, speed, battery, and route monitoring for active courier staff"
      >
        <Button variant="outline" size="sm" onClick={fetchActiveStaff} className="flex items-center space-x-1">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Map</span>
        </Button>
      </PageHeader>

      {/* Control Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 border border-slate-800 rounded-xl">
        <div className="flex items-center space-x-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search staff name or employee ID..."
            className="w-72 bg-slate-950 border-slate-800"
          />
          <Badge variant="success" className="px-3 py-1 text-xs">
            {filteredStaff.length} Staff On Duty
          </Badge>
        </div>

        <div className="flex items-center space-x-4 text-xs font-semibold text-slate-400">
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>Moving (&gt;2 km/h)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 inline-block" />
            <span>Idle (Stopped)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" />
            <span>Offline (&gt;5 mins)</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Map, Right Staff List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive OpenStreetMap */}
        <div className="lg:col-span-2 rounded-xl overflow-hidden border border-slate-800 h-[580px] relative z-0">
          <MapContainer
            center={mapCenter}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', background: '#090d16' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapFlyTo center={mapCenter} />

            {filteredStaff.map((item) => {
              if (!item.latestLocation) return null;
              const lat = item.latestLocation.latitude;
              const lng = item.latestLocation.longitude;

              return (
                <Marker
                  key={item.staff._id}
                  position={[lat, lng]}
                  icon={getMarkerIcon(item)}
                  eventHandlers={{
                    click: () => setSelectedStaff(item)
                  }}
                >
                  <Popup className="custom-popup">
                    <div className="p-1 space-y-2 min-w-[200px] text-slate-900">
                      <div className="font-bold text-sm border-b pb-1">
                        {item.staff.firstName} {item.staff.lastName}
                      </div>
                      <div className="text-xs space-y-1">
                        <p><span className="font-bold">ID:</span> {item.staff.employeeId}</p>
                        <p><span className="font-bold">Branch:</span> {item.staff.branchId?.name}</p>
                        <p><span className="font-bold">Speed:</span> {item.latestLocation.speed || 0} km/h</p>
                        <p><span className="font-bold">Battery:</span> {item.latestLocation.batteryLevel}%</p>
                        <p><span className="font-bold">Last Ping:</span> {new Date(item.latestLocation.timestamp).toLocaleTimeString()}</p>
                      </div>
                      {item.session && (
                        <Button
                          size="sm"
                          onClick={() => setHistoryModalSessionId(item.session._id)}
                          className="w-full mt-2 h-7 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          View Full Route History
                        </Button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Right Drawer: Active Duty Staff List */}
        <Card className="glass-card flex flex-col h-[580px]">
          <CardHeader className="border-b border-slate-800 pb-3">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Navigation className="h-4 w-4 text-indigo-400" />
                <span>On-Duty Staff Feed</span>
              </span>
              <Badge variant="outline">{filteredStaff.length} Active</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 flex-1 overflow-y-auto space-y-3">
            {filteredStaff.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs italic space-y-2">
                <MapPin className="h-8 w-8 mx-auto text-slate-600 stroke-[1.5]" />
                <p>No staff members are currently on duty or transmitting live GPS signals.</p>
              </div>
            ) : (
              filteredStaff.map((item) => {
                const isSelected = selectedStaff?.staff._id === item.staff._id;
                const loc = item.latestLocation;

                return (
                  <div
                    key={item.staff._id}
                    onClick={() => {
                      setSelectedStaff(item);
                      if (loc) setMapCenter([loc.latitude, loc.longitude]);
                    }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/80'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-full bg-indigo-900/60 border border-indigo-700/60 flex items-center justify-center font-bold text-xs text-indigo-300">
                          {item.staff.firstName[0]}{item.staff.lastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-200">{item.staff.firstName} {item.staff.lastName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{item.staff.employeeId} | {item.staff.branchId?.name}</p>
                        </div>
                      </div>
                      <Badge variant={loc?.speed > 2 ? 'success' : 'warning'} className="text-[9px]">
                        {loc?.speed > 2 ? `${loc.speed} km/h` : 'Idle'}
                      </Badge>
                    </div>

                    {loc ? (
                      <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-900/50 p-2 rounded border border-slate-800/60 text-slate-400">
                        <div className="flex items-center space-x-1">
                          <Battery className="h-3 w-3 text-emerald-400" />
                          <span>Battery: {loc.batteryLevel}%</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Route className="h-3 w-3 text-indigo-400" />
                          <span>Dist: {item.session?.totalDistanceKm ? item.session.totalDistanceKm.toFixed(2) : 0} km</span>
                        </div>
                        <div className="flex items-center space-x-1 col-span-2 text-slate-500">
                          <Signal className="h-3 w-3 text-blue-400" />
                          <span>Updated: {new Date(loc.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-yellow-500 italic">Waiting for initial GPS signal...</p>
                    )}

                    {item.session && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setHistoryModalSessionId(item.session._id);
                        }}
                        className="w-full h-7 text-[10px] space-x-1"
                      >
                        <Route className="h-3.5 w-3.5" />
                        <span>View Route History</span>
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Route History Modal */}
      {historyModalSessionId && (
        <RouteHistoryModal
          dutySessionId={historyModalSessionId}
          isOpen={!!historyModalSessionId}
          onClose={() => setHistoryModalSessionId(null)}
        />
      )}
    </div>
  );
};

export default LiveTrackingPage;
