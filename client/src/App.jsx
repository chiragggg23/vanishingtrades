import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';

// Route-level code splitting: every page is its own chunk.
const Home = lazy(() => import('./pages/Home.jsx'));
const Gallery = lazy(() => import('./pages/Gallery.jsx'));
const ArtisanProfile = lazy(() => import('./pages/ArtisanProfile.jsx'));
const Archive = lazy(() => import('./pages/Archive.jsx'));
const StoryDetail = lazy(() => import('./pages/StoryDetail.jsx'));
const Apprenticeships = lazy(() => import('./pages/Apprenticeships.jsx'));
const ApprenticeshipDetail = lazy(() => import('./pages/ApprenticeshipDetail.jsx'));
const Impact = lazy(() => import('./pages/Impact.jsx'));
const Verify = lazy(() => import('./pages/Verify.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));
const ArtisanDashboard = lazy(() => import('./pages/dashboard/ArtisanDashboard.jsx'));
const StoryEditor = lazy(() => import('./pages/dashboard/StoryEditor.jsx'));
const LearnerDashboard = lazy(() => import('./pages/dashboard/LearnerDashboard.jsx'));
const BuyerDashboard = lazy(() => import('./pages/dashboard/BuyerDashboard.jsx'));
const ReviewerDashboard = lazy(() => import('./pages/dashboard/ReviewerDashboard.jsx'));
const ReviewScreen = lazy(() => import('./pages/dashboard/ReviewScreen.jsx'));
const AdminArea = lazy(() => import('./pages/dashboard/AdminArea.jsx'));

const guard = (roles, el) => <ProtectedRoute allowedRoles={roles}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="artisans/:id" element={<ArtisanProfile />} />
        <Route path="archive" element={<Archive />} />
        <Route path="archive/:id" element={<StoryDetail />} />
        <Route path="apprenticeships" element={<Apprenticeships />} />
        <Route path="apprenticeships/:id" element={<ApprenticeshipDetail />} />
        <Route path="impact" element={<Impact />} />
        <Route path="verify" element={<Verify />} />
        <Route path="verify/:code" element={<Verify />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="dashboard/artisan" element={guard(['artisan'], <ArtisanDashboard />)} />
        <Route path="dashboard/artisan/:tab" element={guard(['artisan'], <ArtisanDashboard />)} />
        <Route
          path="dashboard/artisan/stories/:id"
          element={guard(['artisan'], <StoryEditor />)}
        />
        <Route path="dashboard/learner" element={guard(['learner'], <LearnerDashboard />)} />
        <Route path="dashboard/buyer" element={guard(['buyer'], <BuyerDashboard />)} />
        <Route
          path="dashboard/reviewer"
          element={guard(['reviewer', 'admin'], <ReviewerDashboard />)}
        />
        <Route
          path="dashboard/reviewer/:storyId"
          element={guard(['reviewer', 'admin'], <ReviewScreen />)}
        />
        <Route path="admin" element={guard(['admin'], <AdminArea />)} />
        <Route path="admin/:tab" element={guard(['admin'], <AdminArea />)} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
