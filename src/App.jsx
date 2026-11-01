import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Profile from './pages/Profile'
import AdminDashboard from './pages/admin/AdminDashboard'
import Retailers from './pages/admin/Retailers'
import Pricing from './pages/admin/Pricing'
import WalletTopups from './pages/admin/WalletTopups'
import Verifications from './pages/admin/Verifications'
import KycServices from './pages/admin/KycServices'
import KycCases from './pages/admin/KycCases'
import Reports from './pages/admin/Reports'
import WalletControl from './pages/admin/WalletControl'
import AuditLogs from './pages/admin/AuditLogs'
import RetailerDashboard from './pages/retailer/RetailerDashboard'
import Wallet from './pages/retailer/Wallet'
import VerifyCustomer from './pages/retailer/VerifyCustomer'
import KycList from './pages/retailer/KycList'
import KycNew from './pages/retailer/KycNew'
import KycCase from './pages/retailer/KycCase'
import History from './pages/retailer/History'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Super Admin area */}
          <Route
            path="/admin"
            element={<ProtectedRoute role="super_admin"><AppLayout /></ProtectedRoute>}
          >
            <Route index element={<AdminDashboard />} />
            <Route path="retailers" element={<Retailers />} />
            <Route path="kyc-services" element={<KycServices />} />
            <Route path="pricing" element={<Pricing />} />
            <Route path="wallet" element={<WalletTopups />} />
            <Route path="wallets" element={<WalletControl />} />
            <Route path="verifications" element={<Verifications />} />
            <Route path="kyc-cases" element={<KycCases />} />
            <Route path="reports" element={<Reports />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Retailer area */}
          <Route
            path="/retailer"
            element={<ProtectedRoute role="retailer"><AppLayout /></ProtectedRoute>}
          >
            <Route index element={<RetailerDashboard />} />
            <Route path="verify" element={<VerifyCustomer />} />
            <Route path="kyc" element={<KycList />} />
            <Route path="kyc/new" element={<KycNew />} />
            <Route path="kyc/:id" element={<KycCase />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="history" element={<History />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
