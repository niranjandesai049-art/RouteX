'use client';

import React, { useState, useEffect } from 'react';
import { Power, MapPin, CheckCircle, Navigation, PenTool, Circle, Smartphone, ShieldCheck } from 'lucide-react';
import { DriverMap } from './maps/MapLoader';

interface Shipment {
  id: string;
  pickup: string;
  pickupOtp?: string;
  destination: string;
  status: string;
  price: number;
  truckType: string;
  weight: string;
}

interface DriverSimulatorProps {
  activeShipment: Shipment | null;
  onAccept: (id: string) => void;
  onArrivePickup: (id: string) => void;
  onStartTransit: (id: string) => void;
  onDeliver: (id: string) => void;
  onUploadSignature: (id: string, signature: string) => void;
}

export default function DriverSimulator({
  activeShipment,
  onAccept,
  onArrivePickup,
  onStartTransit,
  onDeliver,
  onUploadSignature
}: DriverSimulatorProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [isSigned, setIsSigned] = useState(false);

  // Mock progress coords
  const [mapProgress, setMapProgress] = useState(0);

  useEffect(() => {
    let interval: any;
    if (activeShipment?.status === 'IN_TRANSIT') {
      interval = setInterval(() => {
        setMapProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 1500);
    } else {
      setMapProgress(0);
    }
    return () => clearInterval(interval);
  }, [activeShipment?.status]);

  const handleVerifyPickupOtp = () => {
    const actualOtp = activeShipment?.pickupOtp || '1234';
    if (otpInput === actualOtp) {
      setErrorMessage('');
      setOtpInput('');
      if (activeShipment) onStartTransit(activeShipment.id);
    } else {
      setErrorMessage(`Invalid OTP. Please check shipper dashboard.`);
    }
  };

  const handleVerifyDeliveryOtp = () => {
    if (otpInput === '5678' || otpInput.length === 4) {
      setErrorMessage('');
      setOtpInput('');
      if (activeShipment) onDeliver(activeShipment.id);
    } else {
      setErrorMessage('Invalid OTP. Please check shipper dashboard.');
    }
  };

  const handleSign = () => {
    setIsSigned(true);
    setSignatureData('MOCK_EPOD_SIGNATURE_BASE64_OK');
  };

  const handleCompleteEpod = () => {
    if (activeShipment && signatureData) {
      onUploadSignature(activeShipment.id, signatureData);
      setIsSigned(false);
      setSignatureData('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 min-h-screen">
      {/* Smartphone Mockup Wrapper */}
      <div className="w-[360px] h-[720px] bg-black rounded-[48px] shadow-2xl relative border-[12px] border-gray-800 overflow-hidden flex flex-col">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-6 bg-black rounded-b-2xl z-50 flex items-center justify-center">
          <div className="w-12 h-1 bg-gray-800 rounded-full mb-1"></div>
        </div>

        {/* Screen Content */}
        <div className="flex-1 bg-white text-gray-900 flex flex-col pt-6 relative overflow-y-auto">
          {/* Custom App Bar */}
          <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-30">
            <span className="font-bold text-sm text-gray-900 tracking-tight flex items-center">
              <Smartphone size={16} className="mr-1.5 text-blue-600" /> RouteX Driver
            </span>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`flex items-center text-xs font-semibold px-3 py-1 rounded-full transition ${
                isOnline ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
              }`}
            >
              <Power size={12} className="mr-1" />
              {isOnline ? 'ONLINE' : 'OFFLINE'}
            </button>
          </div>

          {!isOnline ? (
            /* Offline Mode Screen */
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
              <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-6">
                <Power size={32} />
              </div>
              <h4 className="font-bold text-lg mb-2">You are currently offline</h4>
              <p className="text-sm text-gray-400 max-w-xs mb-8">
                Go online to start receiving cargo load bookings from manufacturers and companies.
              </p>
              <button
                onClick={() => setIsOnline(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl text-sm transition"
              >
                Go Online
              </button>
            </div>
          ) : (
            /* Online Mode Screen */
            <div className="flex-1 flex flex-col p-4">
              {!activeShipment ? (
                /* Online - Waiting for Load */
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="relative mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-full animate-ping absolute"></div>
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center relative text-white">
                      <Navigation size={20} />
                    </div>
                  </div>
                  <h4 className="font-bold text-md mb-1">Scanning for Loads...</h4>
                  <p className="text-xs text-gray-400 max-w-xs">
                    Your current location is being shared with matching shippers nearby.
                  </p>
                </div>
              ) : (
                /* Online - Active Job Flow */
                <div className="flex-1 flex flex-col space-y-4">
                  {/* Job Overview */}
                  <div className="border border-gray-100 bg-gray-50 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-blue-600">{activeShipment.id}</span>
                      <span className="text-sm font-bold text-green-600">₹{activeShipment.price.toLocaleString()}</span>
                    </div>
                    <div className="space-y-2.5 mt-4">
                      <div className="flex items-start">
                        <Circle size={10} className="mt-1 mr-2 text-blue-500 fill-blue-500" />
                        <div>
                          <p className="text-xs font-bold text-gray-400">PICKUP</p>
                          <p className="text-xs text-gray-800 font-medium leading-tight">{activeShipment.pickup}</p>
                        </div>
                      </div>
                      <div className="flex items-start">
                        <MapPin size={12} className="mt-0.5 mr-2 text-red-500" />
                        <div>
                          <p className="text-xs font-bold text-gray-400">DESTINATION</p>
                          <p className="text-xs text-gray-800 font-medium leading-tight">{activeShipment.destination}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Flow Stages */}
                  {activeShipment.status === 'PENDING' && (
                    <div className="flex-1 flex flex-col justify-end space-y-3">
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center mb-4">
                        <p className="text-xs text-blue-700 font-semibold">AI Match Score: 98% Match Rate</p>
                      </div>
                      <button
                        onClick={() => onAccept(activeShipment.id)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl text-sm transition"
                      >
                        ACCEPT LOAD
                      </button>
                    </div>
                  )}

                  {activeShipment.status === 'ACCEPTED' && (
                    <div className="flex-grow flex flex-col justify-between space-y-4">
                      {/* GPS Navigation Map */}
                      <div className="h-44 rounded-xl border border-gray-200 overflow-hidden relative">
                        <DriverMap activeShipment={activeShipment} />
                      </div>
                      <button
                        onClick={() => onArrivePickup(activeShipment.id)}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm transition"
                      >
                        I HAVE ARRIVED AT PICKUP
                      </button>
                    </div>
                  )}

                  {activeShipment.status === 'ARRIVED_AT_PICKUP' && (
                    <div className="space-y-4 flex-grow flex flex-col justify-between">
                      <div className="space-y-3">
                        <h4 className="font-bold text-sm text-gray-700 uppercase">Enter Shipper Pickup OTP</h4>
                        <p className="text-xs text-gray-400">Ask the shipper for the 4-digit code displayed on their portal.</p>
                        <input
                          type="text"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value)}
                          placeholder="e.g. 1234"
                          maxLength={4}
                          className="w-full border border-gray-200 rounded-lg p-2.5 text-center font-bold text-lg focus:border-blue-600 outline-none"
                        />
                        {errorMessage && <p className="text-xs text-red-500 font-semibold">{errorMessage}</p>}
                      </div>
                      <button
                        onClick={handleVerifyPickupOtp}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl text-sm transition"
                      >
                        VERIFY OTP & START TRANSIT
                      </button>
                    </div>
                  )}

                  {activeShipment.status === 'IN_TRANSIT' && (
                    <div className="space-y-4 flex-grow flex flex-col justify-between">
                      <div className="space-y-3">
                        <h4 className="font-bold text-sm text-gray-700 uppercase">Transit to Destination</h4>
                        <div className="h-44 rounded-xl border border-gray-200 overflow-hidden relative mb-2">
                          <DriverMap activeShipment={activeShipment} />
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${mapProgress}%` }}></div>
                        </div>
                        <p className="text-xs text-gray-400 text-right">Distance Moved: {mapProgress}%</p>
                      </div>
                      <button
                        onClick={() => onDeliver(activeShipment.id)}
                        disabled={mapProgress < 100}
                        className={`w-full font-bold py-3 rounded-xl text-sm transition ${
                          mapProgress >= 100 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {mapProgress >= 100 ? 'ARRIVED AT DESTINATION' : 'DRIVING IN TRANSIT...'}
                      </button>
                    </div>
                  )}

                  {activeShipment.status === 'DELIVERED' && (
                    <div className="space-y-4 flex-grow flex flex-col justify-between">
                      <div className="space-y-4">
                        <h4 className="font-bold text-sm text-gray-700 uppercase">Electronic Proof of Delivery (ePOD)</h4>
                        
                        {!isSigned ? (
                          <div className="border-2 border-dashed border-gray-200 rounded-xl h-36 flex flex-col items-center justify-center bg-gray-50/50 p-4">
                            <PenTool className="text-gray-300 mb-2" size={24} />
                            <p className="text-xs text-gray-400 text-center mb-4">Shipper signature is required to release payment</p>
                            <button
                              type="button"
                              onClick={handleSign}
                              className="text-xs font-semibold bg-gray-900 text-white px-3 py-1.5 rounded hover:bg-black transition"
                            >
                              Tap to Sign
                            </button>
                          </div>
                        ) : (
                          <div className="border border-green-200 bg-green-50 rounded-xl p-4 flex flex-col items-center justify-center h-36">
                            <ShieldCheck className="text-green-600 mb-2" size={24} />
                            <p className="text-xs text-green-700 font-bold">Proof of Delivery Captured</p>
                            <p className="text-[10px] text-green-600 mt-1">Digital Stamp ID: RX-EPOD-92048</p>
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={handleCompleteEpod}
                        disabled={!isSigned}
                        className={`w-full font-bold py-3 rounded-xl text-sm transition ${
                          isSigned ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        SETTLE TRANSACTION
                      </button>
                    </div>
                  )}

                  {activeShipment.status === 'COMPLETED' && (
                    <div className="flex-grow flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                        <CheckCircle size={24} />
                      </div>
                      <h4 className="font-bold text-md text-gray-800">Trip Completed Successfully!</h4>
                      <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
                        Funds have been deposited to your wallet. You can request an instant payout now.
                      </p>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
