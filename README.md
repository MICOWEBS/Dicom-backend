# DICOM Viewer Backend

A powerful backend service for medical imaging analysis, providing secure DICOM file management, AI-powered image processing, and real-time inference capabilities. Built with Node.js, TypeScript, and Python for seamless integration with medical imaging workflows.

## Features

- RESTful API for DICOM file operations
- User authentication and authorization
- DICOM file processing and metadata extraction
- AI-powered medical image analysis
- Real-time inference status updates
- Secure file storage and retrieval

## Tech Stack

- Node.js with Express
- TypeScript
- MongoDB for data storage
- Python with FastAPI for AI processing
- JWT for authentication
- Cloudinary for file storage

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Python 3.8+
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/MICOWEBS/Dicom-backend.git
cd Dicom-backend
```

2. Install dependencies:
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

3. Create a `.env` file in the root directory:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/dicom-viewer
JWT_SECRET=your-secret-key
PYTHON_PATH=/usr/bin/python3
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - User registration
- POST `/api/auth/login` - User login
- GET `/api/auth/verify` - Token verification

### DICOM Files
- POST `/api/upload` - Upload DICOM file
- GET `/api/files` - Get all files
- GET `/api/files/:id` - Get specific file
- DELETE `/api/files/:id` - Delete file
- GET `/api/files/:id/metadata` - Get file metadata
- GET `/api/files/:id/preview` - Get file preview

### AI Inference
- POST `/api/inference/:id` - Start inference
- GET `/api/inference/status/:id` - Get inference status
- GET `/api/inference/results/:id` - Get inference results

## Deployment

The backend is configured for deployment on Render. See the `render.yaml` file for configuration details.

## Environment Variables

- `PORT`: Server port
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: JWT secret key
- `PYTHON_PATH`: Path to Python executable
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Cloudinary API key
- `CLOUDINARY_API_SECRET`: Cloudinary API secret

## License

This project is licensed under the MIT License - see the LICENSE file for details. 