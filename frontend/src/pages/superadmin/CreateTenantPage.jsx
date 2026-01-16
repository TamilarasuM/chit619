import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const CreateTenantPage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Get ID for edit mode
  const isEditMode = !!id;
  const { logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    // Tenant info
    name: '',
    slug: '',
    email: '',
    phone: '',
    // Branding
    appName: '',
    primaryColor: '#1976d2',
    // Address
    street: '',
    city: '',
    state: '',
    pincode: '',
    // Admin info (only for create mode)
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});

  // Fetch tenant data in edit mode
  useEffect(() => {
    if (isEditMode) {
      fetchTenantData();
    }
  }, [id]);

  const fetchTenantData = async () => {
    try {
      setFetchLoading(true);
      const response = await api.get(`/superadmin/tenants/${id}`);
      if (response.success) {
        const tenant = response.data.tenant;
        setFormData({
          name: tenant.name || '',
          slug: tenant.slug || '',
          email: tenant.email || '',
          phone: tenant.phone || '',
          appName: tenant.branding?.appName || '',
          primaryColor: tenant.branding?.primaryColor || '#1976d2',
          street: tenant.address?.street || '',
          city: tenant.address?.city || '',
          state: tenant.address?.state || '',
          pincode: tenant.address?.pincode || '',
          // Admin fields not needed in edit mode
          adminName: '',
          adminEmail: '',
          adminPhone: '',
          adminPassword: '',
          confirmPassword: '',
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch tenant data');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-generate slug from name
    if (name === 'name') {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData((prev) => ({ ...prev, slug }));
    }

    // Clear field error
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    // Tenant validation
    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Contact email is required';
    } else if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Admin validation (only required for create mode)
    if (!isEditMode) {
      if (!formData.adminName.trim()) {
        newErrors.adminName = 'Admin name is required';
      }
      if (!formData.adminPhone.trim()) {
        newErrors.adminPhone = 'Admin phone is required';
      } else if (!/^[0-9]{10}$/.test(formData.adminPhone)) {
        newErrors.adminPhone = 'Phone must be 10 digits';
      }
      if (!formData.adminPassword) {
        newErrors.adminPassword = 'Password is required';
      } else if (formData.adminPassword.length < 6) {
        newErrors.adminPassword = 'Password must be at least 6 characters';
      }
      if (formData.adminPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);
      setError(null);

      const payload = {
        name: formData.name,
        slug: formData.slug,
        email: formData.email,
        phone: formData.phone,
        branding: {
          appName: formData.appName || formData.name,
          primaryColor: formData.primaryColor,
        },
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        },
      };

      let response;
      if (isEditMode) {
        // Update existing tenant
        response = await api.put(`/superadmin/tenants/${id}`, payload);
      } else {
        // Create new tenant with admin
        payload.adminName = formData.adminName;
        payload.adminEmail = formData.adminEmail;
        payload.adminPhone = formData.adminPhone;
        payload.adminPassword = formData.adminPassword;
        response = await api.post('/superadmin/tenants', payload);
      }

      if (response.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/superadmin/tenants');
        }, 2000);
      }
    } catch (err) {
      setError(err.message || `Failed to ${isEditMode ? 'update' : 'create'} tenant`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (fetchLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/superadmin/tenants')}
          >
            Tenants
          </Button>
          <Typography variant="h4" component="h1">
            {isEditMode ? 'Edit Tenant' : 'Create New Tenant'}
          </Typography>
        </Box>
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

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Tenant {isEditMode ? 'updated' : 'created'} successfully! Redirecting...
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          {/* Organization Details */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Organization Details
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Organization Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Slug (URL identifier)"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                helperText="Auto-generated from name. Used in URLs."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email}
                helperText={errors.email}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Contact Phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Branding */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Branding (Optional)
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="App Name"
                name="appName"
                value={formData.appName}
                onChange={handleChange}
                placeholder="Chit Fund Manager"
                helperText="Custom app name for this tenant"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Primary Color"
                name="primaryColor"
                type="color"
                value={formData.primaryColor}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Address */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Address (Optional)
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Street Address"
                name="street"
                value={formData.street}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="City"
                name="city"
                value={formData.city}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Pincode"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
              />
            </Grid>
          </Grid>

          {/* First Admin - Only show in create mode */}
          {!isEditMode && (
            <>
              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" sx={{ mb: 2 }}>
                First Admin User
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Admin Name"
                    name="adminName"
                    value={formData.adminName}
                    onChange={handleChange}
                    error={!!errors.adminName}
                    helperText={errors.adminName}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Admin Email"
                    name="adminEmail"
                    type="email"
                    value={formData.adminEmail}
                    onChange={handleChange}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Admin Phone (Login)"
                    name="adminPhone"
                    value={formData.adminPhone}
                    onChange={handleChange}
                    error={!!errors.adminPhone}
                    helperText={errors.adminPhone || 'Used for login'}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  {/* Placeholder for alignment */}
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Password"
                    name="adminPassword"
                    type="password"
                    value={formData.adminPassword}
                    onChange={handleChange}
                    error={!!errors.adminPassword}
                    helperText={errors.adminPassword}
                    required
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword}
                    required
                  />
                </Grid>
              </Grid>
            </>
          )}

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/superadmin/tenants')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} />}
            >
              {loading
                ? (isEditMode ? 'Updating...' : 'Creating...')
                : (isEditMode ? 'Update Tenant' : 'Create Tenant')}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default CreateTenantPage;
