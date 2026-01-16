import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  Delete as DeleteIcon,
  ArrowBack as BackIcon,
  Logout as LogoutIcon,
  PersonAdd as PersonAddIcon,
  Key as KeyIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const TenantDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [memberCount, setMemberCount] = useState(0);
  const [chitGroupCount, setChitGroupCount] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null });
  const [suspendReason, setSuspendReason] = useState('');

  // Admin management state
  const [adminMenuAnchor, setAdminMenuAnchor] = useState(null);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [adminDialog, setAdminDialog] = useState({ open: false, type: null });
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [newPassword, setNewPassword] = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    fetchTenantDetails();
  }, [id]);

  const fetchTenantDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/superadmin/tenants/${id}`);
      if (response.success) {
        setTenant(response.data.tenant);
        setAdmins(response.data.admins || []);
        setMemberCount(response.data.memberCount || 0);
        setChitGroupCount(response.data.chitGroupCount || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to load tenant details');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async () => {
    try {
      await api.put(`/superadmin/tenants/${id}/suspend`, {
        reason: suspendReason || 'Suspended by super admin',
      });
      fetchTenantDetails();
      setConfirmDialog({ open: false, type: null });
      setSuspendReason('');
    } catch (err) {
      setError(err.message || 'Failed to suspend tenant');
    }
  };

  const handleActivate = async () => {
    try {
      await api.put(`/superadmin/tenants/${id}/activate`, {});
      fetchTenantDetails();
    } catch (err) {
      setError(err.message || 'Failed to activate tenant');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/superadmin/tenants/${id}`);
      navigate('/superadmin/tenants');
    } catch (err) {
      setError(err.message || 'Failed to delete tenant');
    }
    setConfirmDialog({ open: false, type: null });
  };

  // Admin management handlers
  const handleAdminMenuOpen = (event, admin) => {
    setAdminMenuAnchor(event.currentTarget);
    setSelectedAdmin(admin);
  };

  const handleAdminMenuClose = () => {
    setAdminMenuAnchor(null);
    setSelectedAdmin(null);
  };

  const openAddAdminDialog = () => {
    setAdminForm({ name: '', email: '', phone: '', password: '' });
    setAdminDialog({ open: true, type: 'add' });
  };

  const openEditAdminDialog = () => {
    setAdminForm({
      name: selectedAdmin.name,
      email: selectedAdmin.email || '',
      phone: selectedAdmin.phone,
      password: '',
    });
    setAdminMenuAnchor(null); // Close menu but keep selectedAdmin
    setAdminDialog({ open: true, type: 'edit' });
  };

  const openResetPasswordDialog = () => {
    setNewPassword('');
    setAdminMenuAnchor(null); // Close menu but keep selectedAdmin
    setAdminDialog({ open: true, type: 'resetPassword' });
  };

  const openDeleteAdminDialog = () => {
    setAdminMenuAnchor(null); // Close menu but keep selectedAdmin
    setAdminDialog({ open: true, type: 'deleteAdmin' });
  };

  const closeAdminDialog = () => {
    setAdminDialog({ open: false, type: null });
    setAdminForm({ name: '', email: '', phone: '', password: '' });
    setNewPassword('');
    setSelectedAdmin(null);
  };

  const handleAddAdmin = async () => {
    try {
      setAdminLoading(true);
      await api.post(`/superadmin/tenants/${id}/admins`, adminForm);
      fetchTenantDetails();
      closeAdminDialog();
    } catch (err) {
      setError(err.message || 'Failed to add admin');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleEditAdmin = async () => {
    try {
      setAdminLoading(true);
      await api.put(`/superadmin/tenants/${id}/admins/${selectedAdmin._id}`, {
        name: adminForm.name,
        email: adminForm.email,
        phone: adminForm.phone,
      });
      fetchTenantDetails();
      closeAdminDialog();
    } catch (err) {
      setError(err.message || 'Failed to update admin');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setAdminLoading(true);
      await api.put(`/superadmin/tenants/${id}/admins/${selectedAdmin._id}/reset-password`, {
        newPassword,
      });
      closeAdminDialog();
      setError(null);
      // Show success message (using error state temporarily)
      alert('Password reset successfully');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleDeleteAdmin = async () => {
    try {
      setAdminLoading(true);
      await api.delete(`/superadmin/tenants/${id}/admins/${selectedAdmin._id}`);
      fetchTenantDetails();
      closeAdminDialog();
    } catch (err) {
      setError(err.message || 'Failed to delete admin');
    } finally {
      setAdminLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!tenant) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Tenant not found</Alert>
      </Box>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/superadmin/tenants')}>
          Back
        </Button>
        <Typography variant="h4" component="h1" sx={{ flex: 1 }}>
          {tenant.name}
        </Typography>
        <Chip label={tenant.status} color={getStatusColor(tenant.status)} />
        <Button
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
        >
          Logout
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<EditIcon />}
          onClick={() => navigate(`/superadmin/tenants/${id}/edit`)}
        >
          Edit
        </Button>
        {tenant.status === 'active' ? (
          <Button
            variant="outlined"
            color="warning"
            startIcon={<BlockIcon />}
            onClick={() => setConfirmDialog({ open: true, type: 'suspend' })}
          >
            Suspend
          </Button>
        ) : (
          <Button
            variant="outlined"
            color="success"
            startIcon={<ActivateIcon />}
            onClick={handleActivate}
          >
            Activate
          </Button>
        )}
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setConfirmDialog({ open: true, type: 'delete' })}
        >
          Delete
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Admins
              </Typography>
              <Typography variant="h4">{admins.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Members
              </Typography>
              <Typography variant="h4">{memberCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Chit Groups
              </Typography>
              <Typography variant="h4">{chitGroupCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Details" />
          <Tab label="Admins" />
          <Tab label="Branding" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {tabValue === 0 && (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Organization Name
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {tenant.name}
              </Typography>

              <Typography variant="subtitle2" color="textSecondary">
                Slug
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {tenant.slug}
              </Typography>

              <Typography variant="subtitle2" color="textSecondary">
                Email
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {tenant.email}
              </Typography>

              <Typography variant="subtitle2" color="textSecondary">
                Phone
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {tenant.phone || '-'}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Created
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {new Date(tenant.createdAt).toLocaleString()}
              </Typography>

              {tenant.status === 'suspended' && (
                <>
                  <Typography variant="subtitle2" color="textSecondary">
                    Suspended At
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {tenant.suspendedAt ? new Date(tenant.suspendedAt).toLocaleString() : '-'}
                  </Typography>

                  <Typography variant="subtitle2" color="textSecondary">
                    Suspension Reason
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {tenant.suspensionReason || '-'}
                  </Typography>
                </>
              )}

              {tenant.address && (
                <>
                  <Typography variant="subtitle2" color="textSecondary">
                    Address
                  </Typography>
                  <Typography variant="body1">
                    {[tenant.address.street, tenant.address.city, tenant.address.state, tenant.address.pincode]
                      .filter(Boolean)
                      .join(', ') || '-'}
                  </Typography>
                </>
              )}
            </Grid>
          </Grid>
        </Paper>
      )}

      {tabValue === 1 && (
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Tenant Admins
            </Typography>
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={openAddAdminDialog}
            >
              Add Admin
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No admins found
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((admin) => (
                    <TableRow key={admin._id}>
                      <TableCell>{admin.name}</TableCell>
                      <TableCell>{admin.email || '-'}</TableCell>
                      <TableCell>{admin.phone}</TableCell>
                      <TableCell>
                        <Chip
                          label={admin.status}
                          color={admin.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          onClick={(e) => handleAdminMenuOpen(e, admin)}
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Admin Actions Menu */}
          <Menu
            anchorEl={adminMenuAnchor}
            open={Boolean(adminMenuAnchor)}
            onClose={handleAdminMenuClose}
          >
            <MenuItem onClick={openEditAdminDialog}>
              <EditIcon fontSize="small" sx={{ mr: 1 }} />
              Edit
            </MenuItem>
            <MenuItem onClick={openResetPasswordDialog}>
              <KeyIcon fontSize="small" sx={{ mr: 1 }} />
              Reset Password
            </MenuItem>
            <MenuItem onClick={openDeleteAdminDialog} sx={{ color: 'error.main' }}>
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
              Delete
            </MenuItem>
          </Menu>
        </Paper>
      )}

      {tabValue === 2 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Branding Settings
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">
                App Name
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {tenant.branding?.appName || 'Chit Fund Manager'}
              </Typography>

              <Typography variant="subtitle2" color="textSecondary">
                Primary Color
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: 1,
                    backgroundColor: tenant.branding?.primaryColor || '#1976d2',
                    border: '1px solid #ccc',
                  }}
                />
                <Typography variant="body1">
                  {tenant.branding?.primaryColor || '#1976d2'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Logo
              </Typography>
              <Typography variant="body1">
                {tenant.branding?.logo || 'Not set'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Suspend Dialog */}
      <Dialog
        open={confirmDialog.open && confirmDialog.type === 'suspend'}
        onClose={() => setConfirmDialog({ open: false, type: null })}
      >
        <DialogTitle>Suspend Tenant</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to suspend "{tenant.name}"? Users will not be able to access the system.
          </DialogContentText>
          <TextField
            fullWidth
            label="Reason for suspension"
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, type: null })}>
            Cancel
          </Button>
          <Button onClick={handleSuspend} color="warning" variant="contained">
            Suspend
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog
        open={confirmDialog.open && confirmDialog.type === 'delete'}
        onClose={() => setConfirmDialog({ open: false, type: null })}
      >
        <DialogTitle>Delete Tenant</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{tenant.name}"? This will permanently delete all associated data
            including users, chit groups, auctions, and payments. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, type: null })}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Admin Dialog */}
      <Dialog
        open={adminDialog.open && adminDialog.type === 'add'}
        onClose={closeAdminDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Admin</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={adminForm.name}
              onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={adminForm.email}
              onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Phone (Login)"
              value={adminForm.phone}
              onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
              required
              helperText="10-digit phone number used for login"
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={adminForm.password}
              onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
              required
              helperText="Minimum 6 characters"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAdminDialog} disabled={adminLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleAddAdmin}
            variant="contained"
            disabled={adminLoading || !adminForm.name || !adminForm.phone || !adminForm.password}
          >
            {adminLoading ? <CircularProgress size={24} /> : 'Add Admin'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog
        open={adminDialog.open && adminDialog.type === 'edit'}
        onClose={closeAdminDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Admin</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              fullWidth
              label="Name"
              value={adminForm.name}
              onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={adminForm.email}
              onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
            />
            <TextField
              fullWidth
              label="Phone (Login)"
              value={adminForm.phone}
              onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAdminDialog} disabled={adminLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleEditAdmin}
            variant="contained"
            disabled={adminLoading || !adminForm.name || !adminForm.phone}
          >
            {adminLoading ? <CircularProgress size={24} /> : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={adminDialog.open && adminDialog.type === 'resetPassword'}
        onClose={closeAdminDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Enter a new password for {selectedAdmin?.name}.
          </DialogContentText>
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            helperText="Minimum 6 characters"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAdminDialog} disabled={adminLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleResetPassword}
            variant="contained"
            disabled={adminLoading || newPassword.length < 6}
          >
            {adminLoading ? <CircularProgress size={24} /> : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Admin Dialog */}
      <Dialog
        open={adminDialog.open && adminDialog.type === 'deleteAdmin'}
        onClose={closeAdminDialog}
      >
        <DialogTitle>Delete Admin</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete admin "{selectedAdmin?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAdminDialog} disabled={adminLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteAdmin}
            color="error"
            variant="contained"
            disabled={adminLoading}
          >
            {adminLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TenantDetailsPage;
