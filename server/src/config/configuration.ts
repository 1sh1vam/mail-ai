export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/mailai',
  },
  
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
  },
  
  gcp: {
    projectId: process.env.GCP_PROJECT_ID,
    pubsubTopic: process.env.GMAIL_PUBSUB_TOPIC || 'gmail-notifications',
    pubsubSubscription: process.env.GMAIL_PUBSUB_SUBSCRIPTION || 'gmail-notifications-sub',
  },
  
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  
  groq: {
    apiKey: process.env.GROQ_API_KEY,
  },
});
