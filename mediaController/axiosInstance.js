// axiosInstance.js

import axios from 'axios';
import http from 'http';
import https from 'https';

// Create persistent HTTP and HTTPS agents with Keep-Alive enabled
const httpAgent = new http.Agent({
  keepAlive: true,
  //maxSockets: 100, // optional tuning
  //keepAliveMsecs: 10000, // optional: keep socket alive for 10s
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  //maxSockets: 100, // optional
  keepAliveMsecs: 10000,
});

// Create and export the Axios instance
const axiosInstance = axios.create({
  //timeout: 10000, // Optional timeout for requests
  httpAgent,
  httpsAgent,
});

export default axiosInstance;
