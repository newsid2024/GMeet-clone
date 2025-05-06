import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Peer from 'peerjs';
import io from 'socket.io-client';
import './VideoChat.css';

const VideoChat = () => {
  const { roomId } = useParams();
  const { currentUser } = useAuth();
  
  const [peers, setPeers] = useState({});
  const [userStream, setUserStream] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [networkStatus, setNetworkStatus] = useState('good'); // 'good', 'poor', 'bad'
  
  const socketRef = useRef();
  const peerRef = useRef();
  const userVideoRef = useRef();
  const peersRef = useRef({});
  const screenTrackRef = useRef();
  const messageEndRef = useRef();
  
  // Initialize connection on component mount
  useEffect(() => {
    // Connect to socket.io server
    socketRef.current = io();
    
    // Get media stream
    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    })
    .then(stream => {
      setUserStream(stream);
      userVideoRef.current.srcObject = stream;
      
      // Create a Peer instance with TURN/STUN servers
      peerRef.current = new Peer(undefined, {
        host: '/',
        path: '/peerjs',
        port: '3030',
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { 
              urls: 'turn:numb.viagenie.ca', 
              credential: 'muazkh',
              username: 'webrtc@live.com'
            }
          ]
        }
      });
      
      // Handle peer connection open
      peerRef.current.on('open', userId => {
        console.log('My peer ID is: ' + userId);
        
        // Join room
        socketRef.current.emit('join-room', roomId, userId);
        
        // Add current user to connected users
        setConnectedUsers(prev => [...prev, { 
          id: userId, 
          name: currentUser.username, 
          isLocal: true 
        }]);
      });
      
      // Handle incoming calls
      peerRef.current.on('call', call => {
        // Answer call with our stream
        call.answer(stream);
        
        // Create video element for the peer
        const peerId = call.peer;
        
        // Handle peer video stream
        call.on('stream', peerStream => {
          setPeers(prev => {
            // Don't add duplicate peers
            if (prev[peerId]) return prev;
            
            // Add peer to the list
            const newPeers = { ...prev };
            newPeers[peerId] = peerStream;
            return newPeers;
          });
        });
        
        // Handle closing
        call.on('close', () => {
          setPeers(prev => {
            const newPeers = { ...prev };
            delete newPeers[peerId];
            return newPeers;
          });
          
          setConnectedUsers(prev => prev.filter(user => user.id !== peerId));
        });
        
        // Store call reference
        peersRef.current[peerId] = call;
      });
      
      // Handle users connecting
      socketRef.current.on('user-connected', (userId) => {
        console.log('User connected: ' + userId);
        
        // Add to connected users
        setConnectedUsers(prev => [...prev.filter(u => u.id !== userId), { 
          id: userId, 
          name: 'User ' + userId.substring(0, 5), 
          isLocal: false 
        }]);
        
        // Wait a bit for peer connection to be ready
        setTimeout(() => {
          // Call the new user
          const call = peerRef.current.call(userId, stream);
          
          // Handle peer video stream
          call.on('stream', peerStream => {
            setPeers(prev => {
              // Don't add duplicate peers
              if (prev[userId]) return prev;
              
              // Add peer to the list
              const newPeers = { ...prev };
              newPeers[userId] = peerStream;
              return newPeers;
            });
          });
          
          // Handle closing
          call.on('close', () => {
            setPeers(prev => {
              const newPeers = { ...prev };
              delete newPeers[userId];
              return newPeers;
            });
          });
          
          // Store call reference
          peersRef.current[userId] = call;
        }, 1000);
      });
      
      // Handle users disconnecting
      socketRef.current.on('user-disconnected', userId => {
        console.log('User disconnected: ' + userId);
        
        // Close connection with peer
        if (peersRef.current[userId]) {
          peersRef.current[userId].close();
        }
        
        // Remove peer from the list
        setPeers(prev => {
          const newPeers = { ...prev };
          delete newPeers[userId];
          return newPeers;
        });
        
        // Remove from connected users
        setConnectedUsers(prev => prev.filter(user => user.id !== userId));
      });
      
      // Handle messages
      socketRef.current.on('createMessage', message => {
        setMessages(prev => [...prev, message]);
      });
      
      // Monitor network conditions
      setInterval(() => {
        const connection = peerRef.current?.connection;
        if (connection) {
          const stats = connection.getStats();
          stats.then(results => {
            results.forEach(report => {
              if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
                const jitter = report.jitter;
                const packetsLost = report.packetsLost;
                const packetsReceived = report.packetsReceived;
                const lossRate = packetsLost / (packetsLost + packetsReceived);
                
                if (lossRate > 0.1 || jitter > 50) {
                  setNetworkStatus('bad');
                } else if (lossRate > 0.05 || jitter > 30) {
                  setNetworkStatus('poor');
                } else {
                  setNetworkStatus('good');
                }
              }
            });
          });
        }
      }, 5000);
    })
    .catch(error => {
      console.error('Error accessing media devices:', error);
    });
    
    // Clean up on unmount
    return () => {
      userStream?.getTracks().forEach(track => track.stop());
      peerRef.current?.destroy();
      socketRef.current?.disconnect();
      
      Object.values(peersRef.current).forEach(call => call.close());
    };
  }, [roomId, currentUser]);
  
  // Scroll to bottom of messages when new ones arrive
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Toggle audio mute
  const toggleAudio = () => {
    if (userStream) {
      const audioTrack = userStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioMuted(!audioTrack.enabled);
      }
    }
  };
  
  // Toggle video
  const toggleVideo = () => {
    if (userStream) {
      const videoTrack = userStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };
  
  // Toggle screen sharing
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        
        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrackRef.current = screenTrack;
        
        // Replace video track in all peer connections
        Object.values(peersRef.current).forEach(call => {
          const sender = call.peerConnection.getSenders().find(s => 
            s.track.kind === 'video'
          );
          sender.replaceTrack(screenTrack);
        });
        
        // Replace local video track
        userVideoRef.current.srcObject = screenStream;
        
        // Handle stop sharing
        screenTrack.onended = () => {
          stopScreenSharing();
        };
        
        setIsScreenSharing(true);
      } catch (error) {
        console.error('Error sharing screen:', error);
      }
    } else {
      stopScreenSharing();
    }
  };
  
  // Stop screen sharing
  const stopScreenSharing = () => {
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      
      // Replace screen track with video track in all peer connections
      if (userStream) {
        const videoTrack = userStream.getVideoTracks()[0];
        if (videoTrack) {
          Object.values(peersRef.current).forEach(call => {
            const sender = call.peerConnection.getSenders().find(s => 
              s.track.kind === 'video'
            );
            sender.replaceTrack(videoTrack);
          });
          
          // Restore local video
          userVideoRef.current.srcObject = userStream;
        }
      }
      
      setIsScreenSharing(false);
    }
  };
  
  // Send message
  const sendMessage = (e) => {
    e.preventDefault();
    if (messageInput.trim() && socketRef.current) {
      socketRef.current.emit('message', messageInput);
      setMessageInput('');
    }
  };
  
  // Leave meeting
  const leaveMeeting = () => {
    window.location.href = '/';
  };
  
  return (
    <div className={`video-chat ${networkStatus}`}>
      <div className="video-grid">
        <div className="video-container local-video">
          <video ref={userVideoRef} muted autoPlay playsInline></video>
          <div className="user-name">{currentUser.username} (You)</div>
          {isAudioMuted && <div className="muted-indicator">🔇</div>}
          {isVideoOff && <div className="video-off-indicator">🚫</div>}
        </div>
        
        {Object.entries(peers).map(([peerId, stream]) => (
          <div key={peerId} className="video-container">
            <video
              autoPlay
              playsInline
              ref={video => {
                if (video) video.srcObject = stream;
              }}
            ></video>
            <div className="user-name">
              {connectedUsers.find(u => u.id === peerId)?.name || 'Unknown User'}
            </div>
          </div>
        ))}
      </div>
      
      <div className="controls">
        <button 
          className={`control-btn ${isAudioMuted ? 'active' : ''}`}
          onClick={toggleAudio}
        >
          {isAudioMuted ? '🔇' : '🔊'}
        </button>
        
        <button 
          className={`control-btn ${isVideoOff ? 'active' : ''}`}
          onClick={toggleVideo}
        >
          {isVideoOff ? '📵' : '📹'}
        </button>
        
        <button 
          className={`control-btn ${isScreenSharing ? 'active' : ''}`}
          onClick={toggleScreenShare}
        >
          {isScreenSharing ? '🖥️ Stop' : '🖥️ Share'}
        </button>
        
        <button className="control-btn end-call" onClick={leaveMeeting}>
          ❌ Leave
        </button>
      </div>
      
      <div className="chat-box">
        <div className="messages">
          {messages.map((msg, index) => (
            <div key={index} className="message">
              <div className="message-header">
                <span className="message-sender">
                  {msg.userId === peerRef.current?.id 
                    ? 'You' 
                    : connectedUsers.find(u => u.id === msg.userId)?.name || 'Unknown'}
                </span>
                <span className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="message-content">{msg.text}</div>
            </div>
          ))}
          <div ref={messageEndRef}></div>
        </div>
        
        <form className="message-form" onSubmit={sendMessage}>
          <input 
            type="text" 
            value={messageInput}
            onChange={e => setMessageInput(e.target.value)}
            placeholder="Type a message..."
          />
          <button type="submit">Send</button>
        </form>
      </div>
      
      {networkStatus !== 'good' && (
        <div className="network-warning">
          {networkStatus === 'poor' 
            ? 'Poor connection detected. Video quality may be reduced.' 
            : 'Bad connection detected. Consider turning off video to improve call quality.'}
        </div>
      )}
      
      <div className="room-info">
        <h3>Room: {roomId}</h3>
        <div className="connected-users">
          <h4>Connected Users ({connectedUsers.length})</h4>
          <ul>
            {connectedUsers.map(user => (
              <li key={user.id}>
                {user.name} {user.isLocal ? '(You)' : ''}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VideoChat; 