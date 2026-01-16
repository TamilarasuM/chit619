import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  Delete as DeleteIcon,
  Logout as LogoutIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const TenantsListPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: null });

  useEffect(() => {
    fetchTenants();
  }, [page, rowsPerPage, search]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await api.get('/superadmin/tenants', {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          search: search || undefined,
        },
      });
      if (response.success) {
        setTenants(response.data);
        setTotal(response.total);
      }
    } catch (err) {
      setError(err.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event, tenant) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedTenant(tenant);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTenant(null);
  };

  const handleSuspend = async () => {
    try {
      await api.put(`/superadmin/tenants/${selectedTenant._id}/suspend`, {
        reason: 'Suspended by super admin',
      });
      fetchTenants();
    } catch (err) {
      setError(err.message || 'Failed to suspend tenant');
    }
    handleMenuClose();
  };

  const handleActivate = async () => {
    try {
      await api.put(`/superadmin/tenants/${selectedTenant._id}/activate`, {});
      fetchTenants();
    } catch (err) {
      setError(err.message || 'Failed to activate tenant');
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/superadmin/tenants/${selectedTenant._id}`);
      fetchTenants();
      setConfirmDialog({ open: false, type: null });
    } catch (err) {
      setError(err.message || 'Failed to delete tenant');
    }
    handleMenuClose();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'error';
      case 'inactive':
        return 'default';
      default:
        return 'default';
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/superadmin/dashboard')}
          >
            Dashboard
          </Button>
          <Typography variant="h4" component="h1">
            Tenants
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/superadmin/tenants/create')}
          >
            Create Tenant
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2 }}>
        <Box sx={{ mb: 2 }}>
          <TextField
            placeholder="Search tenants..."
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Slug</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Members</TableCell>
                    <TableCell>Chit Groups</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tenants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No tenants found
                      </TableCell>
                    </TableRow>
                  ) : (
                    tenants.map((tenant) => (
                      <TableRow
                        key={tenant._id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/superadmin/tenants/${tenant._id}`)}
                      >
                        <TableCell>{tenant.name}</TableCell>
                        <TableCell>{tenant.slug}</TableCell>
                        <TableCell>{tenant.email}</TableCell>
                        <TableCell>
                          <Chip
                            label={tenant.status}
                            color={getStatusColor(tenant.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{tenant.stats?.totalMembers || 0}</TableCell>
                        <TableCell>{tenant.stats?.totalChitGroups || 0}</TableCell>
                        <TableCell>
                          {new Date(tenant.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, tenant)}
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
            <TablePagination
              component="div"
              count={total}
              page={page}
              onPageChange={(e, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
          </>
        )}
      </Paper>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          navigate(`/superadmin/tenants/${selectedTenant?._id}/edit`);
          handleMenuClose();
        }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        {selectedTenant?.status === 'active' ? (
          <MenuItem onClick={handleSuspend}>
            <BlockIcon fontSize="small" sx={{ mr: 1 }} />
            Suspend
          </MenuItem>
        ) : (
          <MenuItem onClick={handleActivate}>
            <ActivateIcon fontSize="small" sx={{ mr: 1 }} />
            Activate
          </MenuItem>
        )}
        <MenuItem
          onClick={() => setConfirmDialog({ open: true, type: 'delete' })}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Confirm Delete Dialog */}
      <Dialog
        open={confirmDialog.open && confirmDialog.type === 'delete'}
        onClose={() => setConfirmDialog({ open: false, type: null })}
      >
        <DialogTitle>Delete Tenant</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete tenant "{selectedTenant?.name}"?
            This will permanently delete all associated data including users,
            chit groups, auctions, and payments. This action cannot be undone.
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
    </Box>
  );
};

export default TenantsListPage;
