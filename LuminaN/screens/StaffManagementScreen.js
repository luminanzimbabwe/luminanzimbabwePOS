import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
  RefreshControl,
  Animated,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';
import { ROUTES } from '../constants/navigation';

const { width } = Dimensions.get('window');

const StaffManagementScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [approvedStaff, setApprovedStaff] = useState([]);
  const [inactiveStaff, setInactiveStaff] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [shopCredentials, setShopCredentials] = useState(null);
  const [shopData, setShopData] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showStaffListModal, setShowStaffListModal] = useState(false);

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [hireDateFilter, setHireDateFilter] = useState('all');
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showDirectoryModal, setShowDirectoryModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedStaffForContract, setSelectedStaffForContract] = useState(null);

  // Bulk actions states
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Animation values
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(50));

  // Comment dialog states
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [commentAction, setCommentAction] = useState('');
  const [commentStaffId, setCommentStaffId] = useState(null);
  const [comment, setComment] = useState('');

  // Cashier details states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState(null);
  const [cashierDetails, setCashierDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Edit cashier states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStaffMember, setEditingStaffMember] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    preferred_shift: '',
    role: 'cashier',
    status: 'pending',
    department: '',
    position: '',
    hire_date: '',
    salary_amount: '',
    salary_currency: 'USD',
    payment_frequency: 'monthly',
    notes: ''
  });
  const [editLoading, setEditLoading] = useState(false);

  // Contract states
  const [contractLoading, setContractLoading] = useState(false);
  const [showContractPreview, setShowContractPreview] = useState(false);
  const [previewAnimation] = useState(new Animated.Value(0));
  const [contractForm, setContractForm] = useState({
    position_title: '',
    department: '',
    employment_type: 'Full-time',
    start_date: '',
    end_date: '',
    salary_amount: '',
    salary_currency: 'USD',
    payment_frequency: 'Monthly',
    work_schedule: '',
    probation_period: '3 months',
    benefits: '',
    responsibilities: '',
    termination_notice: '30 days',
    contract_terms: '',
    employer_signature: '',
    employee_signature: '',
    witness_name: '',
    witness_signature: ''
  });

  // Statistics states
  const [staffStats, setStaffStats] = useState({
    totalStaff: 0,
    activeToday: 0,
    newThisWeek: 0,
    pendingApprovals: 0,
    avgTenure: 0,
    turnoverRate: 0,
    departmentCount: 0,
  });

  // Analytics data
  const [analyticsData, setAnalyticsData] = useState({
    totalStaff: 0,
    activeStaff: 0,
    pendingStaff: 0,
    inactiveStaff: 0,
    staffByShift: {},
    staffByRole: {},
    recentActivity: [],
    monthlyGrowth: 0,
  });

  useEffect(() => {
    loadShopCredentials();
  }, []);

  useEffect(() => {
    if (shopCredentials) {
      loadStaffData();
    }
  }, [shopCredentials]);

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadShopCredentials = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      console.log('🔍 Raw credentials from storage:', credentials);

      if (!credentials) {
        navigation.replace(ROUTES.LOGIN);
        return;
      }

      // Extract shop data the same way as dashboard
      const shopInfo = credentials.shop_info || credentials;
      console.log('✅ Extracted shop info:', shopInfo);

      // Validate that we have the essential data
      if (shopInfo.name || shopInfo.email) {
        setShopData(shopInfo);
        setShopCredentials(credentials);
        console.log('✅ Loaded shop data:', shopInfo.name || shopInfo.email);
      } else {
        console.log('⚠️ Shop info missing essential data, trying API fallback');
        await fetchShopDataFromAPI();
      }
    } catch (error) {
      console.error('❌ Error loading credentials:', error);
      navigation.replace(ROUTES.LOGIN);
    }
  };

  const fetchShopDataFromAPI = async () => {
    try {
      console.log('🔄 Fetching shop data from API...');
      const response = await shopAPI.getOwnerDashboard();
      console.log('📡 API Response:', response.data);

      if (response.data.shop_info) {
        setShopData(response.data.shop_info);
        console.log('✅ Loaded shop data from API:', response.data.shop_info);
      } else if (response.data.name || response.data.email) {
        setShopData(response.data);
        console.log('✅ Loaded shop data directly from API:', response.data);
      } else {
        throw new Error('Invalid API response structure');
      }
    } catch (apiError) {
      console.error('❌ Failed to fetch shop data from API:', apiError);
      // Continue without shop data - contract will use fallback values
    }
  };

  const loadStaffData = async () => {
    try {
      const authData = {
        email: shopCredentials.email,
        password: shopCredentials.shop_owner_master_password
      };
      
      const pendingResponse = await shopAPI.getPendingStaff(authData);
      const approvedResponse = await shopAPI.getApprovedStaff(authData);
      const inactiveResponse = await shopAPI.getInactiveStaff(authData);
      
      const pending = pendingResponse.data?.staff || [];
      const approved = approvedResponse.data?.staff || [];
      const inactive = inactiveResponse.data?.staff || [];
      
      setPendingStaff(pending);
      setApprovedStaff(approved);
      setInactiveStaff(inactive);
      
      // Calculate statistics
      const totalStaff = pending.length + approved.length + inactive.length;
      const activeToday = approved.filter(staff => 
        new Date(staff.created_at).toDateString() === new Date().toDateString()
      ).length;
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const newThisWeek = pending.filter(staff => 
        new Date(staff.created_at) >= weekAgo
      ).length;
      
      // Calculate additional metrics
      const allStaffForMetrics = [...approved, ...inactive];
      const avgTenure = allStaffForMetrics.length > 0
        ? Math.round(allStaffForMetrics.reduce((sum, staff) => {
            if (staff.hire_date) {
              const hireDate = new Date(staff.hire_date);
              const now = new Date();
              const months = (now.getFullYear() - hireDate.getFullYear()) * 12 + (now.getMonth() - hireDate.getMonth());
              return sum + months;
            }
            return sum;
          }, 0) / allStaffForMetrics.length)
        : 0;

      // Turnover rate (inactive staff / total staff * 100)
      const turnoverRate = totalStaff > 0 ? Math.round((inactive.length / totalStaff) * 100) : 0;

      // Department count (unique departments)
      const departments = new Set(allStaffForMetrics.map(staff => staff.department).filter(Boolean));
      const departmentCount = departments.size;

      setStaffStats({
        totalStaff,
        activeToday,
        newThisWeek,
        pendingApprovals: pending.length,
        avgTenure,
        turnoverRate,
        departmentCount,
      });

      // Calculate analytics
      calculateAnalytics(pending, approved, inactive);
      
    } catch (error) {
      console.error('Error loading staff data:', error);
      Alert.alert('Error', 'Failed to load staff data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateAnalytics = (pending, approved, inactive) => {
    const allStaff = [...pending, ...approved, ...inactive];
    
    // Staff by shift
    const staffByShift = {};
    allStaff.forEach(staff => {
      const shift = staff.shift || 'Not Specified';
      staffByShift[shift] = (staffByShift[shift] || 0) + 1;
    });

    // Staff by role
    const staffByRole = {};
    allStaff.forEach(staff => {
      const role = staff.role || 'cashier';
      staffByRole[role] = (staffByRole[role] || 0) + 1;
    });

    // Recent activity (last 10 actions)
    const recentActivity = [
      ...pending.map(staff => ({
        type: 'pending',
        message: `${staff.name} registered and is pending approval`,
        time: staff.created_at,
        icon: '⏳'
      })),
      ...approved.map(staff => ({
        type: 'approved',
        message: `${staff.name} was approved and is now active`,
        time: staff.approved_at || staff.created_at,
        icon: '✅'
      })),
      ...inactive.map(staff => ({
        type: 'inactive',
        message: `${staff.name} was deactivated`,
        time: staff.updated_at || staff.created_at,
        icon: '🚫'
      }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

    // Monthly growth (simulated)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthStaff = allStaff.filter(staff => {
      const staffDate = new Date(staff.created_at);
      return staffDate.getMonth() === currentMonth && staffDate.getFullYear() === currentYear;
    }).length;
    
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthStaff = allStaff.filter(staff => {
      const staffDate = new Date(staff.created_at);
      return staffDate.getMonth() === lastMonth && staffDate.getFullYear() === lastMonthYear;
    }).length;

    const monthlyGrowth = lastMonthStaff > 0 ? 
      Math.round(((currentMonthStaff - lastMonthStaff) / lastMonthStaff) * 100) : 
      currentMonthStaff > 0 ? 100 : 0;

    setAnalyticsData({
      totalStaff: allStaff.length,
      activeStaff: approved.length,
      pendingStaff: pending.length,
      inactiveStaff: inactive.length,
      staffByShift,
      staffByRole,
      recentActivity,
      monthlyGrowth,
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStaffData();
  };

  // Search and filter logic
  const filteredStaff = useMemo(() => {
    let allStaff = [];

    switch (selectedFilter) {
      case 'pending':
        allStaff = [...pendingStaff];
        break;
      case 'active':
        allStaff = [...approvedStaff];
        break;
      case 'inactive':
        allStaff = [...inactiveStaff];
        break;
      default:
        allStaff = [...pendingStaff, ...approvedStaff, ...inactiveStaff];
    }

    // Apply advanced filters
    if (departmentFilter !== 'all') {
      allStaff = allStaff.filter(staff => staff.department === departmentFilter);
    }

    if (roleFilter !== 'all') {
      allStaff = allStaff.filter(staff => staff.role === roleFilter);
    }

    if (hireDateFilter !== 'all') {
      const now = new Date();
      allStaff = allStaff.filter(staff => {
        if (!staff.hire_date) return false;
        const hireDate = new Date(staff.hire_date);
        const monthsDiff = (now.getFullYear() - hireDate.getFullYear()) * 12 + (now.getMonth() - hireDate.getMonth());

        switch (hireDateFilter) {
          case 'last_3_months': return monthsDiff <= 3;
          case 'last_6_months': return monthsDiff <= 6;
          case 'last_year': return monthsDiff <= 12;
          case 'over_year': return monthsDiff > 12;
          default: return true;
        }
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      allStaff = allStaff.filter(staff =>
        staff.name.toLowerCase().includes(query) ||
        (staff.email && staff.email.toLowerCase().includes(query)) ||
        (staff.phone && staff.phone.includes(query))
      );
    }

    return allStaff;
  }, [pendingStaff, approvedStaff, inactiveStaff, searchQuery, selectedFilter, departmentFilter, roleFilter, hireDateFilter]);

  const showCommentRequiredDialog = (action, staffId) => {
    setCommentAction(action);
    setCommentStaffId(staffId);
    setComment('');
    setShowCommentDialog(true);
  };

  const executeActionWithComment = async () => {
    if (!comment.trim()) {
      Alert.alert('Error', 'Please provide a comment for audit trail purposes.');
      return;
    }

    setShowCommentDialog(false);

    switch (commentAction) {
      case 'reject':
        await executeReject(commentStaffId, comment);
        break;
      case 'deactivate':
        await executeDeactivate(commentStaffId, comment);
        break;
      case 'delete':
        await executeDelete(commentStaffId, comment);
        break;
      case 'reactivate':
        await executeReactivate(commentStaffId, comment);
        break;
    }
  };

  const handleApprove = (staffId, role) => {
    executeApprove(staffId, role);
  };

  const executeApprove = async (staffId, role) => {
    try {
      const authData = {
        email: shopCredentials.email,
        password: shopCredentials.shop_owner_master_password,
        staff_id: staffId,
        role: role
      };
      
      const response = await shopAPI.approveStaff(authData);
      
      const staffMember = pendingStaff.find(s => s.id === staffId);
      if (staffMember) {
        setPendingStaff(prev => prev.filter(s => s.id !== staffId));
        setApprovedStaff(prev => [...prev, { ...staffMember, role, status: 'approved' }]);
      }
      
      Alert.alert('Success', 'Staff member approved successfully!');
      loadStaffData(); // Refresh stats
      
    } catch (error) {
      console.error('❌ Approval failed:', error);
      Alert.alert('Error', 'Failed to approve staff member.');
    }
  };

  const handleReject = (staffId) => {
    showCommentRequiredDialog('reject', staffId);
  };

  const executeReject = async (staffId, commentText) => {
    try {
      const authData = {
        email: shopCredentials.email,
        password: shopCredentials.shop_owner_master_password,
        staff_id: staffId,
        comment: commentText
      };
      
      const response = await shopAPI.rejectStaff(authData);
      setPendingStaff(prev => prev.filter(s => s.id !== staffId));
      Alert.alert('Success', 'Staff registration rejected and removed.');
      loadStaffData(); // Refresh stats
      
    } catch (error) {
      console.error('❌ Rejection failed:', error);
      Alert.alert('Error', 'Failed to reject staff member.');
    }
  };

  const handleDeactivate = (staffId) => {
    showCommentRequiredDialog('deactivate', staffId);
  };

  const executeDeactivate = async (staffId, commentText) => {
    try {
      const authData = {
        email: shopCredentials.email,
        password: shopCredentials.shop_owner_master_password,
        staff_id: staffId,
        comment: commentText
      };
      
      const response = await shopAPI.deactivateCashier(authData);
      
      const staffMember = approvedStaff.find(s => s.id === staffId);
      if (staffMember) {
        setApprovedStaff(prev => prev.filter(s => s.id !== staffId));
        setInactiveStaff(prev => [...prev, { ...staffMember, status: 'inactive' }]);
      }
      
      Alert.alert('Success', 'Staff member deactivated successfully.');
      loadStaffData(); // Refresh stats
      
    } catch (error) {
      console.error('❌ Deactivation failed:', error);
      Alert.alert('Error', 'Failed to deactivate staff member.');
    }
  };

  const handleDelete = (staffId) => {
    showCommentRequiredDialog('delete', staffId);
  };

  const executeDelete = async (staffId, commentText) => {
    try {
      const authData = {
        email: shopCredentials.email,
        password: shopCredentials.shop_owner_master_password,
        staff_id: staffId,
        comment: commentText
      };
      
      const response = await shopAPI.deleteCashier(authData);
      
      setApprovedStaff(prev => prev.filter(s => s.id !== staffId));
      setInactiveStaff(prev => prev.filter(s => s.id !== staffId));
      Alert.alert('Success', 'Staff member permanently deleted.');
      loadStaffData(); // Refresh stats
      
    } catch (error) {
      console.error('❌ Deletion failed:', error);
      Alert.alert('Error', 'Failed to delete staff member.');
    }
  };

  const handleReactivate = (staffId) => {
    showCommentRequiredDialog('reactivate', staffId);
  };

  const executeReactivate = async (staffId, commentText) => {
    try {
      const authData = {
        email: shopCredentials.email,
        password: shopCredentials.shop_owner_master_password,
        staff_id: staffId,
        comment: commentText
      };
      
      const response = await shopAPI.reactivateCashier(authData);
      
      const staffMember = inactiveStaff.find(s => s.id === staffId);
      if (staffMember) {
        setInactiveStaff(prev => prev.filter(s => s.id !== staffId));
        setApprovedStaff(prev => [...prev, { ...staffMember, status: 'active' }]);
      }
      
      Alert.alert('Success', 'Staff member reactivated successfully.');
      loadStaffData(); // Refresh stats
      
    } catch (error) {
      console.error('❌ Reactivation failed:', error);
      Alert.alert('Error', 'Failed to reactivate staff member.');
    }
  };

  const handleViewDetails = async (staffId) => {
    try {
      setDetailsLoading(true);
      setSelectedCashier(staffId);
      
      const authData = {
        email: shopCredentials.email,
        password: shopCredentials.shop_owner_master_password,
        cashier_id: staffId
      };
      
      const response = await shopAPI.getCashierDetails(authData);
      setCashierDetails(response.data.cashier);
      setShowDetailsModal(true);
      
    } catch (error) {
      console.error('❌ Failed to load cashier details:', error);
      Alert.alert('Error', 'Failed to load cashier details.');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Enhanced handleEdit function that works for all staff types
  const handleEdit = (staffMember) => {
    console.log('✅ Edit button clicked for:', staffMember.name, staffMember.status);
    
    setEditingStaffMember(staffMember);
    setEditForm({
      name: staffMember.name || '',
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      preferred_shift: staffMember.shift || '',
      role: staffMember.role || 'cashier',
      status: staffMember.status || 'pending',
      department: staffMember.department || '',
      position: staffMember.position || '',
      hire_date: staffMember.hire_date || '',
      salary_amount: staffMember.salary_amount?.toString() || '',
      salary_currency: staffMember.salary_currency || 'USD',
      payment_frequency: staffMember.payment_frequency || 'monthly',
      notes: staffMember.notes || ''
    });
    setShowEditModal(true);
  };

  // Contract creation function
  const handleCreateContract = (staffMember) => {
    setSelectedStaffForContract(staffMember);
    
    // Pre-fill contract form with staff data
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const endDate = nextYear.toISOString().split('T')[0];
    
    setContractForm({
      position_title: staffMember.role || 'Cashier',
      department: staffMember.department || 'Sales',
      employment_type: 'Full-time',
      start_date: today,
      end_date: endDate,
      salary_amount: staffMember.salary_amount?.toString() || '',
      salary_currency: staffMember.salary_currency || 'USD',
      payment_frequency: 'Monthly',
      work_schedule: staffMember.preferred_shift || 'To be determined',
      probation_period: '3 months',
      benefits: 'Health insurance, Paid leave, Staff discount',
      responsibilities: 'Handle customer transactions, Maintain cash register, Provide excellent customer service, Assist with inventory management',
      termination_notice: '30 days',
      contract_terms: `This contract is governed by the laws of Zimbabwe. Any disputes shall be resolved through arbitration.`,
      employer_signature: shopCredentials?.name || 'Shop Owner',
      employee_signature: staffMember.name,
      witness_name: '',
      witness_signature: ''
    });
    
    setShowContractModal(true);
  };

  // Generate contract text
  const generateContractText = () => {
    const staff = selectedStaffForContract;
    if (!staff) return '';

    return `
EMPLOYMENT CONTRACT

Shop Information:
${shopCredentials?.name || 'Shop Name'}
${shopCredentials?.address || 'Shop Address'}
Email: ${shopCredentials?.email || 'shop@email.com'}

Employee Information:
Name: ${staff.name}
Email: ${staff.email || 'Not provided'}
Phone: ${staff.phone}

Contract Details:
Position: ${contractForm.position_title}
Department: ${contractForm.department}
Employment Type: ${contractForm.employment_type}
Start Date: ${contractForm.start_date}
End Date: ${contractForm.end_date}

Compensation:
Salary: ${contractForm.salary_amount} ${contractForm.salary_currency} ${contractForm.payment_frequency}
Work Schedule: ${contractForm.work_schedule}

Terms:
Probation Period: ${contractForm.probation_period}
Benefits: ${contractForm.benefits}
Termination Notice: ${contractForm.termination_notice}

Key Responsibilities:
${contractForm.responsibilities}

Additional Terms:
${contractForm.contract_terms}

Signatures:
Employer: ${contractForm.employer_signature}
Employee: ${contractForm.employee_signature}
Witness: ${contractForm.witness_name}

Date: ${new Date().toLocaleDateString()}

This contract constitutes the entire agreement between the parties.
    `.trim();
  };

  // Save and export contract
  const saveContract = async () => {
    try {
      setContractLoading(true);
      
      // Validate required fields
      if (!contractForm.position_title.trim() || !contractForm.start_date.trim()) {
        Alert.alert('Error', 'Position title and start date are required.');
        return;
      }

      // Generate contract text
      const contractText = generateContractText();
      
      // Share the contract
      await Share.share({
        message: contractText,
        title: `Employment Contract - ${selectedStaffForContract.name}`
      });
      
      Alert.alert('Success', 'Contract generated successfully! You can now print or share it.');
      setShowContractModal(false);
      
    } catch (error) {
      console.error('❌ Contract generation failed:', error);
      Alert.alert('Error', 'Failed to generate contract.');
    } finally {
      setContractLoading(false);
    }
  };

  // Enhanced executeEdit function with comprehensive validation
  const executeEdit = async () => {
    try {
      setEditLoading(true);
      
      // Validate required fields
      if (!editForm.name.trim()) {
        Alert.alert('Error', 'Name is required.');
        return;
      }
      
      if (!editForm.phone.trim()) {
        Alert.alert('Error', 'Phone number is required.');
        return;
      }

      // Prepare data for API
      const editData = {
        email: shopCredentials.email,
        password: shopCredentials.shop_owner_master_password,
        cashier_id: editingStaffMember.id,
        name: editForm.name.trim(),
        email_field: editForm.email.trim() || null, // Use email_field to avoid conflicts
        phone: editForm.phone.trim(),
        preferred_shift: editForm.preferred_shift.trim(),
        role: editForm.role,
        status: editForm.status,
        department: editForm.department.trim() || null,
        position: editForm.position.trim() || null,
        hire_date: editForm.hire_date || null,
        salary_amount: editForm.salary_amount ? parseFloat(editForm.salary_amount) : null,
        salary_currency: editForm.salary_currency,
        payment_frequency: editForm.payment_frequency,
        notes: editForm.notes.trim() || null
      };

      console.log('🔄 Updating cashier with data:', editData);
      
      const response = await shopAPI.editCashier(editData);
      console.log('✅ Edit response:', response.data);
      
      // Update local state based on staff type
      const updatedStaff = response.data.cashier;
      
      if (editingStaffMember.status === 'pending') {
        setPendingStaff(prev => 
          prev.map(staff => 
            staff.id === editingStaffMember.id 
              ? { ...staff, ...updatedStaff }
              : staff
          )
        );
      } else if (editingStaffMember.status === 'active') {
        setApprovedStaff(prev => 
          prev.map(staff => 
            staff.id === editingStaffMember.id 
              ? { ...staff, ...updatedStaff, shift: updatedStaff.preferred_shift }
              : staff
          )
        );
      } else if (editingStaffMember.status === 'inactive') {
        setInactiveStaff(prev => 
          prev.map(staff => 
            staff.id === editingStaffMember.id 
              ? { ...staff, ...updatedStaff, shift: updatedStaff.preferred_shift }
              : staff
          )
        );
      }
      
      setShowEditModal(false);
      Alert.alert('Success', 'Staff member updated successfully!');
      loadStaffData(); // Refresh stats and analytics
      
    } catch (error) {
      console.error('❌ Failed to edit cashier:', error);
      
      // Show specific error message
      if (error.response?.data?.error) {
        Alert.alert('Error', error.response.data.error);
      } else if (error.message) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to update staff member. Please try again.');
      }
    } finally {
      setEditLoading(false);
    }
  };

  // Quick edit for pending staff (approve + edit)
  const handleQuickEdit = async (staffMember) => {
    Alert.alert(
      'Quick Edit & Approve',
      `Do you want to edit and approve ${staffMember.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Edit & Approve', 
          onPress: () => {
            handleEdit(staffMember);
          }
        }
      ]
    );
  };

  const handleExportStaff = async () => {
    try {
      const allStaff = [...pendingStaff, ...approvedStaff, ...inactiveStaff];
      
      // Create CSV content
      const csvHeaders = 'Name,Email,Phone,Status,Role,Shift,Department,Position,Hire Date,Salary\n';
      const csvData = allStaff.map(staff => 
        `"${staff.name}","${staff.email || 'N/A'}","${staff.phone}","${staff.status}","${staff.role || 'cashier'}","${staff.shift || 'N/A'}","${staff.department || 'N/A'}","${staff.position || 'N/A'}","${staff.hire_date || 'N/A'}","${staff.salary_amount || 'N/A'}"`
      ).join('\n');
      
      const csvContent = csvHeaders + csvData;
      
      // Share the data
      await Share.share({
        message: `Staff List Export\n\nTotal Staff: ${allStaff.length}\n\n${csvContent}`,
        title: 'Staff List Export'
      });
      
      Alert.alert('Success', 'Staff list exported successfully!');
      
    } catch (error) {
      console.error('❌ Export failed:', error);
      Alert.alert('Error', 'Failed to export staff list.');
    }
  };

  const handleViewAnalytics = () => {
    setShowAnalyticsModal(true);
  };

  const toggleInactiveView = () => {
    setShowInactive(!showInactive);
  };

  // Bulk actions functions
  const toggleBulkMode = () => {
    setBulkMode(!bulkMode);
    setSelectedStaffIds([]);
    setShowBulkActions(false);
  };

  const toggleStaffSelection = (staffId) => {
    setSelectedStaffIds(prev =>
      prev.includes(staffId)
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const selectAllStaff = () => {
    const allIds = filteredStaff.map(staff => staff.id);
    setSelectedStaffIds(allIds);
  };

  const deselectAllStaff = () => {
    setSelectedStaffIds([]);
  };

  const bulkApprove = async () => {
    if (selectedStaffIds.length === 0) return;

    try {
      for (const staffId of selectedStaffIds) {
        const staffMember = pendingStaff.find(s => s.id === staffId);
        if (staffMember) {
          await executeApprove(staffId, 'cashier');
        }
      }
      Alert.alert('Success', `Approved ${selectedStaffIds.length} staff member(s) successfully!`);
      setSelectedStaffIds([]);
      setBulkMode(false);
    } catch (error) {
      Alert.alert('Error', 'Some approvals failed. Please try again.');
    }
  };

  const bulkReject = async () => {
    if (selectedStaffIds.length === 0) return;

    Alert.alert(
      'Bulk Reject',
      `Are you sure you want to reject ${selectedStaffIds.length} staff registration(s)? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const staffId of selectedStaffIds) {
                await executeReject(staffId, 'Bulk rejection via staff management system');
              }
              Alert.alert('Success', `Rejected ${selectedStaffIds.length} staff registration(s)`);
              setSelectedStaffIds([]);
              setBulkMode(false);
            } catch (error) {
              Alert.alert('Error', 'Some rejections failed. Please try again.');
            }
          }
        }
      ]
    );
  };

  const bulkDeactivate = async () => {
    if (selectedStaffIds.length === 0) return;

    Alert.alert(
      'Bulk Deactivate',
      `Are you sure you want to deactivate ${selectedStaffIds.length} staff member(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const staffId of selectedStaffIds) {
                await executeDeactivate(staffId, 'Bulk deactivation via staff management system');
              }
              Alert.alert('Success', `Deactivated ${selectedStaffIds.length} staff member(s)`);
              setSelectedStaffIds([]);
              setBulkMode(false);
            } catch (error) {
              Alert.alert('Error', 'Some deactivations failed. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handlePreviewContract = () => {
    setShowContractPreview(true);
    Animated.timing(previewAnimation, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const handleBackToEdit = () => {
    Animated.timing(previewAnimation, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => setShowContractPreview(false));
  };

  const initializeContractForm = (staff) => {
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const endDate = nextYear.toISOString().split('T')[0];

    setContractForm({
      position_title: staff.role || 'Cashier',
      department: staff.department || 'Sales',
      employment_type: 'Full-time',
      start_date: today,
      end_date: endDate,
      salary_amount: staff.salary_amount?.toString() || '',
      salary_currency: staff.salary_currency || 'USD',
      payment_frequency: 'Monthly',
      work_schedule: staff.preferred_shift || 'To be determined',
      probation_period: '3 months',
      benefits: 'Health insurance, Paid leave, Staff discount',
      responsibilities: 'Handle customer transactions, Maintain cash register, Provide excellent customer service, Assist with inventory management',
      termination_notice: '30 days',
      contract_terms: `EMPLOYMENT CONTRACT

This Employment Contract ("Contract") is entered into on ${new Date().toLocaleDateString()} between:

EMPLOYER: LUMINA BAKERY
Address: 123 Bakery Street, Harare, Zimbabwe
Email: ownershop@gmail.com

and

EMPLOYEE: ${staff.name}
Email: ${staff.email || 'Not provided'}
Phone: ${staff.phone}

1. POSITION AND EMPLOYMENT
The Employer agrees to employ the Employee as a ${staff.role || 'Cashier'} in the ${staff.department || 'Sales'} department. This is a Full-time position commencing on ${today} and ending on ${endDate} (or until terminated).

2. COMPENSATION AND BENEFITS
2.1 Salary: The Employee shall receive a gross salary of ${staff.salary_amount || '0'} ${staff.salary_currency || 'USD'} payable Monthly.
2.2 Benefits: Health insurance, Paid annual leave, Staff discount on products
2.3 The salary is subject to statutory deductions including PAYE, ZIMRA contributions, and any other lawful deductions.

3. HOURS OF WORK
3.1 Work Schedule: ${staff.preferred_shift || 'Monday to Friday, 8:00 AM to 5:00 PM, with breaks as required by law'}
3.2 The Employee may be required to work additional hours or different shifts as business needs require, with appropriate compensation.

4. PROBATIONARY PERIOD
The Employee shall serve a probationary period of 3 months from the commencement date. During this period, either party may terminate employment with 2 weeks notice.

5. DUTIES AND RESPONSIBILITIES
The Employee's primary duties and responsibilities include:
- Handle customer transactions efficiently and accurately
- Maintain cash register and financial records
- Provide excellent customer service
- Assist with inventory management and stock control
- Maintain cleanliness and organization of work area
- Follow all company policies and procedures

6. LEAVE ENTITLEMENTS
The Employee shall be entitled to paid annual leave in accordance with the Labour Act [Chapter 28:01] of Zimbabwe, currently 24 working days per year for employees with more than 12 months service.

7. TERMINATION OF EMPLOYMENT
7.1 Notice Period: Either party may terminate this contract by giving 30 days written notice.
7.2 Summary Dismissal: The Employer may terminate employment without notice for gross misconduct including theft, fraud, violence, or serious breach of company policy.
7.3 The Employee shall return all company property upon termination.

8. CONFIDENTIALITY AND NON-DISCLOSURE
The Employee agrees to maintain strict confidentiality regarding all business information, customer data, pricing, supplier information, and any proprietary processes or systems.

9. INTELLECTUAL PROPERTY
Any work created by the Employee during the course of employment, including ideas, designs, or processes, shall be the property of the Employer.

10. CODE OF CONDUCT
The Employee agrees to maintain professional conduct at all times, wear appropriate uniform, comply with health and safety regulations, and not accept gifts from suppliers or customers.

11. DISCIPLINARY PROCEDURE
Minor breaches of conduct may result in verbal warnings, written warnings, or suspension. Serious breaches may result in summary dismissal.

12. GRIEVANCE PROCEDURE
Any grievances should be raised with the immediate supervisor in writing, with a right to appeal to management.

13. GOVERNING LAW
This Contract shall be governed by the laws of Zimbabwe and subject to the jurisdiction of the Zimbabwean courts. Any disputes shall be resolved through the Labour Court or arbitration as appropriate.

14. AMENDMENT
This Contract may only be amended in writing and signed by both parties.

15. ENTIRE AGREEMENT
This Contract constitutes the entire agreement between the parties and supersedes all prior agreements, understandings, or representations.

16. SEVERABILITY
If any provision of this Contract is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.

SIGNED on this ${new Date().getDate()} day of ${new Date().toLocaleString('default', { month: 'long' })}, ${new Date().getFullYear()}

EMPLOYER SIGNATURE: ___________________________    EMPLOYEE SIGNATURE: ___________________________

Name: ${shopCredentials?.name || 'Shop Owner'}    Name: ${staff.name}

Date: _______________    Date: _______________

WITNESS (if required): ___________________________

Name: ${''}

Signature: ___________________________`,
      employer_signature: shopData?.name || shopData?.shop_name || 'LUMINA BAKERY',
      employee_signature: staff.name,
      witness_name: '',
      witness_signature: '',
      signed_date: '',
      is_signed: false,
    });
  };

  const getActionTitle = () => {
    switch (commentAction) {
      case 'reject': return 'Reject Staff Registration';
      case 'deactivate': return 'Deactivate Staff Member';
      case 'delete': return 'Delete Staff Member';
      case 'reactivate': return 'Reactivate Staff Member';
      default: return 'Confirm Action';
    }
  };

  const getActionDescription = () => {
    switch (commentAction) {
      case 'reject': return 'Please provide a reason for rejecting this staff registration:';
      case 'deactivate': return 'Please provide a reason for deactivating this staff member:';
      case 'delete': return 'Please provide a reason for permanently deleting this staff member:';
      case 'reactivate': return 'Please provide a reason for reactivating this staff member:';
      default: return 'Please provide additional information:';
    }
  };

  const renderStatCard = (title, value, icon, color, subtitle = '') => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statIconContainer}>
        <Text style={[styles.statIcon, { color }]}>{icon}</Text>
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle ? <Text style={styles.statSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );

  const renderQuickAction = (title, icon, color, onPress, description = '') => (
    <TouchableOpacity style={[styles.quickActionCard, { borderTopColor: color }]} onPress={onPress}>
      <View style={styles.quickActionContent}>
        <Text style={[styles.quickActionIcon, { color }]}>{icon}</Text>
        <View style={styles.quickActionTextContainer}>
          <Text style={styles.quickActionTitle}>{title}</Text>
          {description ? <Text style={styles.quickActionDescription}>{description}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderStaffCard = (staff, showActions = true) => (
    <View key={staff.id} style={styles.staffCard}>
      <View style={styles.staffCardHeader}>
        {bulkMode && (
          <TouchableOpacity
            style={styles.bulkCheckbox}
            onPress={() => toggleStaffSelection(staff.id)}
          >
            <Text style={[
              styles.checkboxIcon,
              selectedStaffIds.includes(staff.id) && styles.checkboxSelected
            ]}>
              {selectedStaffIds.includes(staff.id) ? '☑️' : '☐'}
            </Text>
          </TouchableOpacity>
        )}
        <View style={styles.staffAvatar}>
          <Text style={styles.staffAvatarText}>
            {staff.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.staffInfo}>
          <Text style={styles.staffName}>{staff.name}</Text>
          <Text style={styles.staffEmail}>{staff.email || 'No email'}</Text>
          <Text style={styles.staffPhone}>{staff.phone}</Text>
        </View>
        <View style={[styles.statusBadge,
          staff.status === 'pending' ? styles.pendingBadge :
          staff.status === 'active' ? styles.activeBadge : styles.inactiveBadge
        ]}>
          <Text style={styles.statusBadgeText}>
            {staff.status === 'pending' ? '⏳ PENDING' :
             staff.status === 'active' ? '✅ ACTIVE' : '🚫 INACTIVE'}
          </Text>
        </View>
      </View>
      
      {staff.shift && <Text style={styles.staffShift}>🕒 Shift: {staff.shift}</Text>}
      {staff.role && <Text style={styles.staffRole}>👔 Role: {staff.role}</Text>}
      {staff.department && <Text style={styles.staffDepartment}>🏢 Dept: {staff.department}</Text>}
      
      {showActions && (
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleViewDetails(staff.id)}
          >
            <Text style={styles.actionButtonText}>📋</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEdit(staff)}
          >
            <Text style={styles.actionButtonText}>✏️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.contractAction]}
            onPress={() => {
              console.log('📄 Contract button pressed for:', staff.name);
              setSelectedStaffForContract(staff);
              initializeContractForm(staff);
              setShowContractModal(true);
            }}
          >
            <Text style={styles.actionButtonText}>📄</Text>
          </TouchableOpacity>
          
          {staff.status === 'pending' && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.approveAction]}
                onPress={() => handleApprove(staff.id, 'cashier')}
              >
                <Text style={styles.actionButtonText}>✅</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.quickEditAction]}
                onPress={() => handleQuickEdit(staff)}
              >
                <Text style={styles.actionButtonText}>⚡</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.rejectAction]}
                onPress={() => handleReject(staff.id)}
              >
                <Text style={styles.actionButtonText}>❌</Text>
              </TouchableOpacity>
            </>
          )}
          
          {staff.status === 'active' && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.deactivateAction]}
                onPress={() => handleDeactivate(staff.id)}
              >
                <Text style={styles.actionButtonText}>🚫</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteAction]}
                onPress={() => handleDelete(staff.id)}
              >
                <Text style={styles.actionButtonText}>🗑️</Text>
              </TouchableOpacity>
            </>
          )}
          
          {staff.status === 'inactive' && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.reactivateAction]}
                onPress={() => handleReactivate(staff.id)}
              >
                <Text style={styles.actionButtonText}>🔄</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteAction]}
                onPress={() => handleDelete(staff.id)}
              >
                <Text style={styles.actionButtonText}>🗑️</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Staff Management</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading staff dashboard...</Text>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {/* Enhanced Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {bulkMode ? `Select Staff (${selectedStaffIds.length})` : 'Staff Management'}
        </Text>
        <View style={styles.headerActions}>
          {bulkMode ? (
            <>
              <TouchableOpacity onPress={selectAllStaff}>
                <Text style={styles.headerActionButton}>Select All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={deselectAllStaff}>
                <Text style={styles.headerActionButton}>Deselect All</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleBulkMode}>
                <Text style={styles.cancelBulkButton}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={toggleBulkMode}>
                <Text style={styles.bulkModeButton}>☑️ Bulk</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onRefresh}>
                <Text style={styles.refreshButton}>🔄</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Bulk Actions Bar */}
      {bulkMode && selectedStaffIds.length > 0 && (
        <View style={styles.bulkActionsBar}>
          <Text style={styles.bulkActionsText}>
            {selectedStaffIds.length} staff selected
          </Text>
          <View style={styles.bulkActionButtons}>
            {selectedFilter === 'pending' && (
              <>
                <TouchableOpacity style={styles.bulkApproveButton} onPress={bulkApprove}>
                  <Text style={styles.bulkButtonText}>✅ Approve All</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bulkRejectButton} onPress={bulkReject}>
                  <Text style={styles.bulkButtonText}>❌ Reject All</Text>
                </TouchableOpacity>
              </>
            )}
            {selectedFilter === 'active' && (
              <TouchableOpacity style={styles.bulkDeactivateButton} onPress={bulkDeactivate}>
                <Text style={styles.bulkButtonText}>🚫 Deactivate All</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Enhanced Statistics Cards */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionHeader}>📊 Staff Overview</Text>
          <View style={styles.statsRow}>
            {renderStatCard('Total Staff', staffStats.totalStaff, '👥', '#3b82f6')}
            {renderStatCard('Pending Approval', staffStats.pendingApprovals, '⏳', '#f59e0b')}
          </View>
          <View style={styles.statsRow}>
            {renderStatCard('New This Week', staffStats.newThisWeek, '🆕', '#10b981')}
            {renderStatCard('Active Today', staffStats.activeToday, '🔥', '#ef4444')}
          </View>
          <View style={styles.statsRow}>
            {renderStatCard('Avg Tenure', `${staffStats.avgTenure} months`, '📅', '#8b5cf6')}
            {renderStatCard('Turnover Rate', `${staffStats.turnoverRate}%`, '📈', '#f97316')}
          </View>
          <View style={styles.statsRow}>
            {renderStatCard('Departments', staffStats.departmentCount, '🏢', '#06b6d4')}
            {renderStatCard('Active Staff', approvedStaff.length, '✅', '#22c55e')}
          </View>
        </View>

        {/* Enhanced Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionHeader}>⚡ Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {renderQuickAction(
              'View All Staff',
              '👥',
              '#3b82f6',
              () => setShowStaffListModal(true),
              `${staffStats.totalStaff} total members`
            )}
            {renderQuickAction(
              'Manage Pending',
              '⏳',
              '#f59e0b',
              () => {
                setSelectedFilter('pending');
                setShowStaffListModal(true);
              },
              `${staffStats.pendingApprovals} waiting approval`
            )}
            {renderQuickAction(
              'Export Staff List',
              '📤',
              '#10b981',
              handleExportStaff,
              'Download staff data'
            )}
            {renderQuickAction(
              'Staff Analytics',
              '📈',
              '#8b5cf6',
              handleViewAnalytics,
              'View detailed reports'
            )}
            {renderQuickAction(
              'Staff Directory',
              '📞',
              '#ec4899',
              () => setShowDirectoryModal(true),
              'Contact list & details'
            )}
            {renderQuickAction(
              'Performance',
              '📊',
              '#10b981',
              () => setShowPerformanceModal(true),
              'Sales & attendance metrics'
            )}
          </View>
        </View>

        {/* Enhanced Search and Filter */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Search staff by name or email..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />

          <View style={styles.filterContainer}>
            {['all', 'pending', 'active', 'inactive'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  selectedFilter === filter && styles.filterButtonActive
                ]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text style={[
                  styles.filterButtonText,
                  selectedFilter === filter && styles.filterButtonTextActive
                ]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={[
                styles.filterButton,
                showAdvancedFilters && styles.filterButtonActive
              ]}
              onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Text style={[
                styles.filterButtonText,
                showAdvancedFilters && styles.filterButtonTextActive
              ]}>
                ⚙️ Advanced
              </Text>
            </TouchableOpacity>
          </View>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <View style={styles.advancedFiltersContainer}>
              <Text style={styles.advancedFiltersTitle}>🔍 Advanced Filters</Text>

              <View style={styles.advancedFilterRow}>
                <View style={styles.advancedFilterGroup}>
                  <Text style={styles.advancedFilterLabel}>Department:</Text>
                  <View style={styles.advancedFilterButtons}>
                    {['all', 'Sales', 'Admin', 'Warehouse', 'Kitchen'].map((dept) => (
                      <TouchableOpacity
                        key={dept}
                        style={[
                          styles.advancedFilterButton,
                          departmentFilter === dept && styles.advancedFilterButtonActive
                        ]}
                        onPress={() => setDepartmentFilter(dept)}
                      >
                        <Text style={[
                          styles.advancedFilterButtonText,
                          departmentFilter === dept && styles.advancedFilterButtonTextActive
                        ]}>
                          {dept === 'all' ? 'All' : dept}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.advancedFilterRow}>
                <View style={styles.advancedFilterGroup}>
                  <Text style={styles.advancedFilterLabel}>Role:</Text>
                  <View style={styles.advancedFilterButtons}>
                    {['all', 'cashier', 'manager', 'supervisor', 'barista'].map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.advancedFilterButton,
                          roleFilter === role && styles.advancedFilterButtonActive
                        ]}
                        onPress={() => setRoleFilter(role)}
                      >
                        <Text style={[
                          styles.advancedFilterButtonText,
                          roleFilter === role && styles.advancedFilterButtonTextActive
                        ]}>
                          {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.advancedFilterRow}>
                <View style={styles.advancedFilterGroup}>
                  <Text style={styles.advancedFilterLabel}>Hire Date:</Text>
                  <View style={styles.advancedFilterButtons}>
                    {[
                      { key: 'all', label: 'All' },
                      { key: 'last_3_months', label: 'Last 3 Months' },
                      { key: 'last_6_months', label: 'Last 6 Months' },
                      { key: 'last_year', label: 'Last Year' },
                      { key: 'over_year', label: 'Over 1 Year' }
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[
                          styles.advancedFilterButton,
                          hireDateFilter === option.key && styles.advancedFilterButtonActive
                        ]}
                        onPress={() => setHireDateFilter(option.key)}
                      >
                        <Text style={[
                          styles.advancedFilterButtonText,
                          hireDateFilter === option.key && styles.advancedFilterButtonTextActive
                        ]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setDepartmentFilter('all');
                  setRoleFilter('all');
                  setHireDateFilter('all');
                }}
              >
                <Text style={styles.clearFiltersButtonText}>🗑️ Clear All Filters</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Filtered Results */}
        {searchQuery.trim() || selectedFilter !== 'all' ? (
          <View style={styles.searchResultsContainer}>
            <Text style={styles.sectionHeader}>
              🔍 Search Results ({filteredStaff.length})
            </Text>
            <ScrollView horizontal style={styles.searchResultsScroll}>
              {filteredStaff.length > 0 ? (
                filteredStaff.map(staff => renderStaffCard(staff))
              ) : (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>
                    {searchQuery.trim() ? `No staff found for "${searchQuery}"` : 'No staff in this category'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        ) : null}

        {/* Recent Activity */}
        <View style={styles.recentActivityContainer}>
          <Text style={styles.sectionHeader}>🕒 Recent Activity</Text>
          <View style={styles.activityCard}>
            <Text style={styles.activityItem}>
              📝 {pendingStaff.length} new staff registration{pendingStaff.length !== 1 ? 's' : ''} pending approval
            </Text>
            <Text style={styles.activityItem}>
              ✅ {approvedStaff.length} staff member{approvedStaff.length !== 1 ? 's' : ''} currently active
            </Text>
            <Text style={styles.activityItem}>
              🚫 {inactiveStaff.length} staff member{inactiveStaff.length !== 1 ? 's' : ''} inactive
            </Text>
          </View>
        </View>

        {/* Toggle Inactive */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={styles.toggleButton}
            onPress={toggleInactiveView}
          >
            <Text style={styles.toggleButtonText}>
              {showInactive ? '👁️ Hide Inactive Staff' : `👁️ Show Inactive Staff (${inactiveStaff.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Staff List Modal */}
      <Modal
        visible={showStaffListModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStaffListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.staffListModalContainer}>
            <Text style={styles.modalTitle}>
              👥 All Staff Members ({filteredStaff.length})
            </Text>
            
            <ScrollView style={styles.staffListContent} contentContainerStyle={styles.staffListContentContainer}>
              {filteredStaff.length > 0 ? (
                filteredStaff.map(staff => renderStaffCard(staff))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>👥 No Staff Members</Text>
                  <Text style={styles.emptyText}>
                    {searchQuery.trim() ? `No staff found for "${searchQuery}"` : 'No staff members found.'}
                  </Text>
                </View>
              )}
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowStaffListModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Contract Creation Modal */}
      <Modal
        visible={showContractModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowContractModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.contractModalContainer, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>
              📄 Create Employment Contract {selectedStaffForContract && `(${selectedStaffForContract.name})`}
            </Text>
            
            <ScrollView style={styles.contractFormContent} contentContainerStyle={styles.contractFormContentContainer}>
              {/* Basic Contract Information */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>📋 Position Details</Text>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Position Title *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={contractForm.position_title}
                    onChangeText={(text) => setContractForm({...contractForm, position_title: text})}
                    placeholder="e.g., Senior Cashier, Store Manager"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Department</Text>
                  <TextInput
                    style={styles.formInput}
                    value={contractForm.department}
                    onChangeText={(text) => setContractForm({...contractForm, department: text})}
                    placeholder="e.g., Sales, Admin, Operations"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Employment Type</Text>
                  <TextInput
                    style={styles.formInput}
                    value={contractForm.employment_type}
                    onChangeText={(text) => setContractForm({...contractForm, employment_type: text})}
                    placeholder="Full-time, Part-time, Contract"
                  />
                </View>
              </View>

              {/* Employment Dates */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>📅 Employment Period</Text>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Start Date *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={contractForm.start_date}
                    onChangeText={(text) => setContractForm({...contractForm, start_date: text})}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>End Date</Text>
                  <TextInput
                    style={styles.formInput}
                    value={contractForm.end_date}
                    onChangeText={(text) => setContractForm({...contractForm, end_date: text})}
                    placeholder="YYYY-MM-DD (leave empty for permanent)"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Probation Period</Text>
                  <TextInput
                    style={styles.formInput}
                    value={contractForm.probation_period}
                    onChangeText={(text) => setContractForm({...contractForm, probation_period: text})}
                    placeholder="e.g., 3 months"
                  />
                </View>
              </View>

              {/* Compensation */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>💰 Compensation</Text>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Salary Amount</Text>
                  <TextInput
                    style={styles.formInput}
                    value={contractForm.salary_amount}
                    onChangeText={(text) => setContractForm({...contractForm, salary_amount: text})}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Currency</Text>
                  <TextInput
                    style={styles.formInput}
                    value={contractForm.salary_currency}
                    onChangeText={(text) => setContractForm({...contractForm, salary_currency: text})}
                    placeholder="USD, ZIG"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Payment Frequency</Text>
                  <TextInput
                    style={styles.formInput}
                    value={contractForm.payment_frequency}
                    onChangeText={(text) => setContractForm({...contractForm, payment_frequency: text})}
                    placeholder="Weekly, Bi-weekly, Monthly"
                  />
                </View>
              </View>

              {/* Work Schedule */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>🕒 Work Schedule</Text>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Work Schedule</Text>
                  <TextInput
                    style={styles.formInput}
                    value={contractForm.work_schedule}
                    onChangeText={(text) => setContractForm({...contractForm, work_schedule: text})}
                    placeholder="e.g., Monday-Friday 8AM-5PM"
                  />
                </View>
              </View>

              {/* Benefits and Terms */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>🎁 Benefits & Terms</Text>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Benefits</Text>
                  <TextInput
                    style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                    value={contractForm.benefits}
                    onChangeText={(text) => setContractForm({...contractForm, benefits: text})}
                    placeholder="Health insurance, Paid leave, etc."
                    multiline
                    numberOfLines={3}
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Termination Notice</Text>
                  <TextInput
                    style={styles.formInput}
                    value={contractForm.termination_notice}
                    onChangeText={(text) => setContractForm({...contractForm, termination_notice: text})}
                    placeholder="e.g., 30 days"
                  />
                </View>
              </View>

              {/* Responsibilities */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>📝 Key Responsibilities</Text>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Primary Duties</Text>
                  <TextInput
                    style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                    value={contractForm.responsibilities}
                    onChangeText={(text) => setContractForm({...contractForm, responsibilities: text})}
                    placeholder="List the main job responsibilities..."
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </View>

              {/* Additional Terms */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>⚖️ Additional Terms</Text>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Contract Terms</Text>
                  <TextInput
                    style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                    value={contractForm.contract_terms}
                    onChangeText={(text) => setContractForm({...contractForm, contract_terms: text})}
                    placeholder="Additional legal terms and conditions..."
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              {/* Signatures */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>✍️ Signatures</Text>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Employer Signature</Text>
                  <TextInput
                    style={styles.formInput}
                    value={contractForm.employer_signature}
                    onChangeText={(text) => setContractForm({...contractForm, employer_signature: text})}
                    placeholder="Shop owner name"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Employee Signature</Text>
                  <TextInput
                    style={styles.formInput}
                    value={contractForm.employee_signature}
                    onChangeText={(text) => setContractForm({...contractForm, employee_signature: text})}
                    placeholder="Employee name"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Witness Name (Optional)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={contractForm.witness_name}
                    onChangeText={(text) => setContractForm({...contractForm, witness_name: text})}
                    placeholder="Witness full name"
                  />
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowContractModal(false)}
                disabled={contractLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmButton, contractLoading && styles.disabledButton]}
                onPress={saveContract}
                disabled={contractLoading}
              >
                {contractLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Generate Contract</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Analytics Modal */}
      <Modal
        visible={showAnalyticsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAnalyticsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.analyticsModalContainer, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>📈 Staff Analytics</Text>
            
            <ScrollView style={styles.analyticsContent} contentContainerStyle={styles.analyticsContentContainer}>
              {/* Overview Stats */}
              <View style={styles.analyticsSection}>
                <Text style={styles.analyticsSectionTitle}>📊 Overview</Text>
                <View style={styles.analyticsStatsGrid}>
                  <View style={styles.analyticsStatCard}>
                    <Text style={styles.analyticsStatNumber}>{analyticsData.totalStaff}</Text>
                    <Text style={styles.analyticsStatLabel}>Total Staff</Text>
                  </View>
                  <View style={styles.analyticsStatCard}>
                    <Text style={styles.analyticsStatNumber}>{analyticsData.activeStaff}</Text>
                    <Text style={styles.analyticsStatLabel}>Active</Text>
                  </View>
                  <View style={styles.analyticsStatCard}>
                    <Text style={styles.analyticsStatNumber}>{analyticsData.pendingStaff}</Text>
                    <Text style={styles.analyticsStatLabel}>Pending</Text>
                  </View>
                  <View style={styles.analyticsStatCard}>
                    <Text style={styles.analyticsStatNumber}>{analyticsData.inactiveStaff}</Text>
                    <Text style={styles.analyticsStatLabel}>Inactive</Text>
                  </View>
                </View>
              </View>

              {/* Staff by Shift */}
              <View style={styles.analyticsSection}>
                <Text style={styles.analyticsSectionTitle}>🕒 Staff by Shift</Text>
                {Object.entries(analyticsData.staffByShift).map(([shift, count]) => (
                  <View key={shift} style={styles.analyticsItem}>
                    <Text style={styles.analyticsItemLabel}>{shift}</Text>
                    <Text style={styles.analyticsItemValue}>{count} staff</Text>
                  </View>
                ))}
              </View>

              {/* Staff by Role */}
              <View style={styles.analyticsSection}>
                <Text style={styles.analyticsSectionTitle}>👔 Staff by Role</Text>
                {Object.entries(analyticsData.staffByRole).map(([role, count]) => (
                  <View key={role} style={styles.analyticsItem}>
                    <Text style={styles.analyticsItemLabel}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
                    <Text style={styles.analyticsItemValue}>{count} staff</Text>
                  </View>
                ))}
              </View>

              {/* Growth Metrics */}
              <View style={styles.analyticsSection}>
                <Text style={styles.analyticsSectionTitle}>📈 Growth Metrics</Text>
                <View style={styles.analyticsItem}>
                  <Text style={styles.analyticsItemLabel}>Monthly Growth</Text>
                  <Text style={[styles.analyticsItemValue, { color: analyticsData.monthlyGrowth >= 0 ? '#10b981' : '#ef4444' }]}>
                    {analyticsData.monthlyGrowth >= 0 ? '+' : ''}{analyticsData.monthlyGrowth}%
                  </Text>
                </View>
              </View>

              {/* Recent Activity */}
              <View style={styles.analyticsSection}>
                <Text style={styles.analyticsSectionTitle}>🕒 Recent Activity</Text>
                {analyticsData.recentActivity.map((activity, index) => (
                  <View key={index} style={styles.activityItem}>
                    <Text style={styles.activityIcon}>{activity.icon}</Text>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityMessage}>{activity.message}</Text>
                      <Text style={styles.activityTime}>
                        {new Date(activity.time).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
            
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={() => setShowAnalyticsModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Performance Dashboard Modal */}
      <Modal
        visible={showPerformanceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPerformanceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.performanceModalContainer, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>📊 Staff Performance Dashboard</Text>

            <ScrollView style={styles.performanceContent} contentContainerStyle={styles.performanceContentContainer}>
              {/* Overall Performance Summary */}
              <View style={styles.performanceSummary}>
                <Text style={styles.performanceSummaryTitle}>🏆 Overall Performance</Text>
                <View style={styles.performanceSummaryGrid}>
                  <View style={styles.performanceSummaryCard}>
                    <Text style={styles.performanceSummaryValue}>
                      ${approvedStaff.reduce((sum, staff) => sum + (staff.salary_amount || 0), 0).toLocaleString()}
                    </Text>
                    <Text style={styles.performanceSummaryLabel}>Total Payroll</Text>
                  </View>
                  <View style={styles.performanceSummaryCard}>
                    <Text style={styles.performanceSummaryValue}>
                      {Math.round(approvedStaff.length * 8.5 * 30)}h
                    </Text>
                    <Text style={styles.performanceSummaryLabel}>Monthly Hours</Text>
                  </View>
                  <View style={styles.performanceSummaryCard}>
                    <Text style={styles.performanceSummaryValue}>
                      {approvedStaff.length > 0 ? Math.round(95 - Math.random() * 10) : 0}%
                    </Text>
                    <Text style={styles.performanceSummaryLabel}>Avg Satisfaction</Text>
                  </View>
                </View>
              </View>

              {/* Individual Staff Performance */}
              <View style={styles.performanceStaffSection}>
                <Text style={styles.performanceSectionTitle}>👥 Individual Performance</Text>

                {approvedStaff.map(staff => {
                  // Generate simulated performance data
                  const sales = Math.floor(Math.random() * 5000) + 1000;
                  const hours = Math.floor(Math.random() * 40) + 160; // 160-200 hours/month
                  const satisfaction = Math.floor(Math.random() * 20) + 80; // 80-100%
                  const efficiency = Math.round((sales / hours) * 10) / 10;

                  return (
                    <View key={staff.id} style={styles.performanceStaffCard}>
                      <View style={styles.performanceStaffHeader}>
                        <View style={styles.performanceStaffAvatar}>
                          <Text style={styles.performanceStaffAvatarText}>
                            {staff.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.performanceStaffInfo}>
                          <Text style={styles.performanceStaffName}>{staff.name}</Text>
                          <Text style={styles.performanceStaffRole}>
                            {staff.role || 'Cashier'} • {staff.department || 'Sales'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.performanceMetrics}>
                        <View style={styles.performanceMetric}>
                          <Text style={styles.performanceMetricValue}>${sales.toLocaleString()}</Text>
                          <Text style={styles.performanceMetricLabel}>Monthly Sales</Text>
                        </View>
                        <View style={styles.performanceMetric}>
                          <Text style={styles.performanceMetricValue}>{hours}h</Text>
                          <Text style={styles.performanceMetricLabel}>Hours Worked</Text>
                        </View>
                        <View style={styles.performanceMetric}>
                          <Text style={styles.performanceMetricValue}>{satisfaction}%</Text>
                          <Text style={styles.performanceMetricLabel}>Satisfaction</Text>
                        </View>
                        <View style={styles.performanceMetric}>
                          <Text style={styles.performanceMetricValue}>${efficiency}/h</Text>
                          <Text style={styles.performanceMetricLabel}>Efficiency</Text>
                        </View>
                      </View>

                      {/* Performance Bar */}
                      <View style={styles.performanceBar}>
                        <View
                          style={[
                            styles.performanceBarFill,
                            { width: `${Math.min(satisfaction, 100)}%` }
                          ]}
                        />
                      </View>
                      <Text style={styles.performanceBarLabel}>
                        Performance Rating: {satisfaction >= 95 ? 'Excellent' :
                                           satisfaction >= 85 ? 'Good' :
                                           satisfaction >= 75 ? 'Average' : 'Needs Improvement'}
                      </Text>
                    </View>
                  );
                })}

                {approvedStaff.length === 0 && (
                  <View style={styles.emptyPerformance}>
                    <Text style={styles.emptyPerformanceText}>No active staff to display performance for</Text>
                  </View>
                )}
              </View>

              {/* Department Performance */}
              <View style={styles.performanceDeptSection}>
                <Text style={styles.performanceSectionTitle}>🏢 Department Performance</Text>

                {['Sales', 'Admin', 'Warehouse', 'Kitchen'].map(dept => {
                  const deptStaff = approvedStaff.filter(staff => staff.department === dept);
                  if (deptStaff.length === 0) return null;

                  const avgSatisfaction = Math.floor(Math.random() * 15) + 85;
                  const totalSales = deptStaff.reduce((sum, staff) => sum + (Math.floor(Math.random() * 3000) + 500), 0);

                  return (
                    <View key={dept} style={styles.performanceDeptCard}>
                      <View style={styles.performanceDeptHeader}>
                        <Text style={styles.performanceDeptName}>{dept}</Text>
                        <Text style={styles.performanceDeptCount}>{deptStaff.length} staff</Text>
                      </View>
                      <View style={styles.performanceDeptMetrics}>
                        <Text style={styles.performanceDeptMetric}>Avg Satisfaction: {avgSatisfaction}%</Text>
                        <Text style={styles.performanceDeptMetric}>Total Sales: ${totalSales.toLocaleString()}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowPerformanceModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Close Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Staff Directory Modal */}
      <Modal
        visible={showDirectoryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDirectoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.directoryModalContainer, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>📞 Staff Directory</Text>

            <ScrollView style={styles.directoryContent} contentContainerStyle={styles.directoryContentContainer}>
              {/* Group staff by department */}
              {['Sales', 'Admin', 'Warehouse', 'Kitchen'].map(department => {
                const deptStaff = [...approvedStaff, ...inactiveStaff].filter(
                  staff => staff.department === department || (!staff.department && department === 'Sales')
                );

                if (deptStaff.length === 0) return null;

                return (
                  <View key={department} style={styles.directorySection}>
                    <Text style={styles.directorySectionTitle}>🏢 {department} ({deptStaff.length})</Text>

                    {deptStaff.map(staff => (
                      <View key={staff.id} style={styles.directoryCard}>
                        <View style={styles.directoryCardHeader}>
                          <View style={styles.directoryAvatar}>
                            <Text style={styles.directoryAvatarText}>
                              {staff.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.directoryInfo}>
                            <Text style={styles.directoryName}>{staff.name}</Text>
                            <Text style={styles.directoryRole}>
                              {staff.role ? staff.role.charAt(0).toUpperCase() + staff.role.slice(1) : 'Cashier'}
                              {staff.status === 'inactive' && ' (Inactive)'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.directoryContact}>
                          <TouchableOpacity style={styles.directoryContactItem}>
                            <Text style={styles.directoryContactIcon}>📧</Text>
                            <Text style={styles.directoryContactText}>
                              {staff.email || 'No email'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.directoryContactItem}>
                            <Text style={styles.directoryContactIcon}>📱</Text>
                            <Text style={styles.directoryContactText}>
                              {staff.phone || 'No phone'}
                            </Text>
                          </TouchableOpacity>

                          {staff.shift && (
                            <View style={styles.directoryContactItem}>
                              <Text style={styles.directoryContactIcon}>🕒</Text>
                              <Text style={styles.directoryContactText}>
                                {staff.shift}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}

              {/* Staff without department */}
              {(() => {
                const noDeptStaff = [...approvedStaff, ...inactiveStaff].filter(
                  staff => !staff.department
                );

                if (noDeptStaff.length === 0) return null;

                return (
                  <View style={styles.directorySection}>
                    <Text style={styles.directorySectionTitle}>👥 Other ({noDeptStaff.length})</Text>

                    {noDeptStaff.map(staff => (
                      <View key={staff.id} style={styles.directoryCard}>
                        <View style={styles.directoryCardHeader}>
                          <View style={styles.directoryAvatar}>
                            <Text style={styles.directoryAvatarText}>
                              {staff.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.directoryInfo}>
                            <Text style={styles.directoryName}>{staff.name}</Text>
                            <Text style={styles.directoryRole}>
                              {staff.role ? staff.role.charAt(0).toUpperCase() + staff.role.slice(1) : 'Cashier'}
                              {staff.status === 'inactive' && ' (Inactive)'}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.directoryContact}>
                          <TouchableOpacity style={styles.directoryContactItem}>
                            <Text style={styles.directoryContactIcon}>📧</Text>
                            <Text style={styles.directoryContactText}>
                              {staff.email || 'No email'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity style={styles.directoryContactItem}>
                            <Text style={styles.directoryContactIcon}>📱</Text>
                            <Text style={styles.directoryContactText}>
                              {staff.phone || 'No phone'}
                            </Text>
                          </TouchableOpacity>

                          {staff.shift && (
                            <View style={styles.directoryContactItem}>
                              <Text style={styles.directoryContactIcon}>🕒</Text>
                              <Text style={styles.directoryContactText}>
                                {staff.shift}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })()}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowDirectoryModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Close Directory</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Enhanced Edit Staff Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editModalContainer, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>
              ✏️ Edit Staff Member {editingStaffMember && `(${editingStaffMember.name})`}
            </Text>
            
            <ScrollView style={styles.editFormContent} contentContainerStyle={styles.editFormContentContainer}>
              {/* Basic Information */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>👤 Basic Information</Text>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.name}
                    onChangeText={(text) => setEditForm({...editForm, name: text})}
                    placeholder="Enter full name"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Email</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.email}
                    onChangeText={(text) => setEditForm({...editForm, email: text})}
                    placeholder="Enter email address"
                    keyboardType="email-address"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Phone *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.phone}
                    onChangeText={(text) => setEditForm({...editForm, phone: text})}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Work Information */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>💼 Work Information</Text>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Role</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.role}
                    onChangeText={(text) => setEditForm({...editForm, role: text})}
                    placeholder="e.g., cashier, manager, supervisor"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Preferred Shift</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.preferred_shift}
                    onChangeText={(text) => setEditForm({...editForm, preferred_shift: text})}
                    placeholder="e.g., morning, afternoon, night"
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Status</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.status}
                    onChangeText={(text) => setEditForm({...editForm, status: text})}
                    placeholder="pending, active, inactive"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Department</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.department}
                    onChangeText={(text) => setEditForm({...editForm, department: text})}
                    placeholder="e.g., Sales, Admin, Warehouse"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Position</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.position}
                    onChangeText={(text) => setEditForm({...editForm, position: text})}
                    placeholder="e.g., Senior Cashier, Department Head"
                  />
                </View>
              </View>

              {/* Employment Details */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>📅 Employment Details</Text>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Hire Date</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.hire_date}
                    onChangeText={(text) => setEditForm({...editForm, hire_date: text})}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Salary Amount</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.salary_amount}
                    onChangeText={(text) => setEditForm({...editForm, salary_amount: text})}
                    placeholder="0.00"
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Salary Currency</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.salary_currency}
                    onChangeText={(text) => setEditForm({...editForm, salary_currency: text})}
                    placeholder="USD, ZIG"
                  />
                </View>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Payment Frequency</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.payment_frequency}
                    onChangeText={(text) => setEditForm({...editForm, payment_frequency: text})}
                    placeholder="weekly, bi_weekly, monthly, hourly"
                  />
                </View>
              </View>

              {/* Additional Information */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>📝 Additional Information</Text>
                
                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Notes</Text>
                  <TextInput
                    style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                    value={editForm.notes}
                    onChangeText={(text) => setEditForm({...editForm, notes: text})}
                    placeholder="Additional notes about this staff member..."
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowEditModal(false)}
                disabled={editLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.confirmButton, editLoading && styles.disabledButton]}
                onPress={executeEdit}
                disabled={editLoading}
              >
                {editLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Comment Dialog */}
      <Modal
        visible={showCommentDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCommentDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{getActionTitle()}</Text>
            <Text style={styles.modalDescription}>{getActionDescription()}</Text>
            
            <TextInput
              style={styles.commentInput}
              placeholder="Enter comment/reason..."
              placeholderTextColor="#999"
              value={comment}
              onChangeText={setComment}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowCommentDialog(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={executeActionWithComment}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cashier Details Modal */}
      <Modal
        visible={showDetailsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>Cashier Details</Text>

            {detailsLoading ? (
              <ActivityIndicator size="large" color="#3b82f6" />
            ) : cashierDetails ? (
              <ScrollView style={styles.detailsContent} contentContainerStyle={styles.detailsContentContainer}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Name:</Text>
                  <Text style={styles.detailValue}>{cashierDetails.name}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Email:</Text>
                  <Text style={styles.detailValue}>{cashierDetails.email || 'Not provided'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Phone:</Text>
                  <Text style={styles.detailValue}>{cashierDetails.phone}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Role:</Text>
                  <Text style={styles.detailValue}>{cashierDetails.role}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Preferred Shift:</Text>
                  <Text style={styles.detailValue}>{cashierDetails.preferred_shift || 'Not specified'}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <Text style={styles.detailValue}>{cashierDetails.status}</Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Registered:</Text>
                  <Text style={styles.detailValue}>{cashierDetails.created_at}</Text>
                </View>

                {cashierDetails.approved_at && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Approved:</Text>
                    <Text style={styles.detailValue}>{cashierDetails.approved_at}</Text>
                  </View>
                )}

                {cashierDetails.performance && (
                  <>
                    <Text style={styles.performanceTitle}>Performance Metrics</Text>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Total Sales:</Text>
                      <Text style={styles.detailValue}>${cashierDetails.performance.total_sales_amount}</Text>
                    </View>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Total Shifts:</Text>
                      <Text style={styles.detailValue}>{cashierDetails.performance.total_shifts}</Text>
                    </View>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Hours Worked:</Text>
                      <Text style={styles.detailValue}>{cashierDetails.performance.total_hours_worked}h</Text>
                    </View>
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Avg Sales/Hour:</Text>
                      <Text style={styles.detailValue}>${cashierDetails.performance.average_sales_per_hour}</Text>
                    </View>
                  </>
                )}
              </ScrollView>
            ) : (
              <Text style={styles.errorText}>Failed to load cashier details</Text>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDetailsModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Contract Modal */}
      <Modal
        visible={showContractModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowContractModal(false)}
      >
        <View style={styles.contractModalOverlay}>
          <View style={styles.contractModalContainer}>
            <View style={styles.contractModalHeader}>
                <Text style={styles.contractModalTitle}>
                  {showContractPreview ? '📜 Employment Contract Document' : '📄 Employment Contract Editor'} {selectedStaffForContract && `(${selectedStaffForContract.name})`}
                </Text>
                <View style={styles.contractModalHeaderActions}>
                  {!showContractPreview && (
                    <TouchableOpacity
                      style={styles.contractPreviewButton}
                      onPress={handlePreviewContract}
                    >
                      <Text style={styles.contractPreviewButtonText}>👁️ Preview</Text>
                    </TouchableOpacity>
                  )}
                  {showContractPreview && (
                    <TouchableOpacity
                      style={styles.contractEditButton}
                      onPress={handleBackToEdit}
                    >
                      <Text style={styles.contractEditButtonText}>✏️ Edit</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.contractModalClose}
                    onPress={() => setShowContractModal(false)}
                  >
                    <Text style={styles.contractModalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

            {showContractPreview ? (
              /* Contract Document Preview */
              <Animated.View
                style={[
                  styles.contractDocumentContainer,
                  {
                    opacity: previewAnimation,
                    transform: [
                      {
                        scale: previewAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      },
                      {
                        rotate: previewAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['-2deg', '0deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <ScrollView
                  style={styles.contractDocumentScroll}
                  contentContainerStyle={styles.contractDocumentContent}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Vintage Paper Background */}
                  <View style={styles.contractPaper}>
                    {/* Corner Decorations */}
                    <View style={styles.contractCornerTL}>
                      <Text style={styles.contractCornerSymbol}>❦</Text>
                    </View>
                    <View style={styles.contractCornerTR}>
                      <Text style={styles.contractCornerSymbol}>❦</Text>
                    </View>
                    <View style={styles.contractCornerBL}>
                      <Text style={styles.contractCornerSymbol}>❦</Text>
                    </View>
                    <View style={styles.contractCornerBR}>
                      <Text style={styles.contractCornerSymbol}>❦</Text>
                    </View>

                    {/* Watermark */}
                    <View style={styles.contractWatermark}>
                      <Text style={styles.contractWatermarkText}>LUMINA</Text>
                    </View>
                    {/* Company Header */}
                    <View style={styles.contractHeader}>
                      <View style={styles.contractCompanyInfo}>
                        <Text style={styles.contractCompanyName}>
                          {shopData?.name || shopData?.shop_name || 'LUMINA BAKERY'}
                        </Text>
                        <Text style={styles.contractCompanyAddress}>
                          {shopData?.address || '123 Bakery Street, Harare, Zimbabwe'}
                        </Text>
                        <Text style={styles.contractCompanyContact}>
                          Email: {shopData?.email || 'ownershop@gmail.com'}
                        </Text>
                        <Text style={styles.contractCompanyContact}>
                          Phone: +263 XXX XXX XXX
                        </Text>
                      </View>
                      <View style={styles.contractLogo}>
                        <Text style={styles.contractLogoText}>🏪</Text>
                      </View>
                    </View>

                    {/* Document Title */}
                    <View style={styles.contractTitleSection}>
                      <Text style={styles.contractMainTitle}>EMPLOYMENT CONTRACT</Text>
                      <Text style={styles.contractSubtitle}>
                        Agreement for Employment Services
                      </Text>
                      <View style={styles.contractDivider} />
                    </View>

                    {/* Parties Information */}
                    <View style={styles.contractParties}>
                      <View style={styles.contractParty}>
                        <Text style={styles.contractPartyTitle}>EMPLOYER:</Text>
                        <Text style={styles.contractPartyText}>
                          {shopData?.name || shopData?.shop_name || 'LUMINA BAKERY'}
                        </Text>
                        <Text style={styles.contractPartyText}>
                          {shopData?.address || '123 Bakery Street, Harare, Zimbabwe'}
                        </Text>
                        <Text style={styles.contractPartyText}>
                          Email: {shopData?.email || 'ownershop@gmail.com'}
                        </Text>
                      </View>

                      <View style={styles.contractParty}>
                        <Text style={styles.contractPartyTitle}>EMPLOYEE:</Text>
                        <Text style={styles.contractPartyText}>
                          {selectedStaffForContract?.name || 'Employee Name'}
                        </Text>
                        <Text style={styles.contractPartyText}>
                          Email: {selectedStaffForContract?.email || 'Not provided'}
                        </Text>
                        <Text style={styles.contractPartyText}>
                          Phone: {selectedStaffForContract?.phone || 'Not provided'}
                        </Text>
                      </View>
                    </View>

                    {/* Contract Content */}
                    <View style={styles.contractBody}>
                      <Text style={styles.contractDate}>
                        Date: {new Date().toLocaleDateString('en-ZW', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </Text>

                      <Text style={styles.contractSectionHeader}>1. POSITION AND EMPLOYMENT</Text>
                      <Text style={styles.contractText}>
                        The Employer agrees to employ the Employee as a {contractForm.position_title || 'Cashier'} in the {contractForm.department || 'Sales'} department. This is a {contractForm.employment_type || 'Full-time'} position commencing on {contractForm.start_date || 'Start Date'} and ending on {contractForm.end_date || 'End Date (or until terminated)'}.
                      </Text>

                      <Text style={styles.contractSectionHeader}>2. COMPENSATION AND BENEFITS</Text>
                      <Text style={styles.contractText}>
                        2.1 Salary: The Employee shall receive a gross salary of {contractForm.salary_amount || '0'} {contractForm.salary_currency || 'USD'} payable {contractForm.payment_frequency || 'Monthly'}.
                      </Text>
                      <Text style={styles.contractText}>
                        2.2 Benefits: {contractForm.benefits || 'Health insurance, Paid annual leave, Staff discount on products'}
                      </Text>

                      <Text style={styles.contractSectionHeader}>3. HOURS OF WORK</Text>
                      <Text style={styles.contractText}>
                        3.1 Work Schedule: {contractForm.work_schedule || 'Monday to Friday, 8:00 AM to 5:00 PM, with breaks as required by law'}
                      </Text>

                      <Text style={styles.contractSectionHeader}>4. PROBATIONARY PERIOD</Text>
                      <Text style={styles.contractText}>
                        The Employee shall serve a probationary period of {contractForm.probation_period || '3 months'} from the commencement date.
                      </Text>

                      <Text style={styles.contractSectionHeader}>5. DUTIES AND RESPONSIBILITIES</Text>
                      <Text style={styles.contractText}>
                        {contractForm.responsibilities || 'Handle customer transactions, Maintain cash register, Provide excellent customer service, Assist with inventory management'}
                      </Text>

                      <Text style={styles.contractSectionHeader}>6. LEAVE ENTITLEMENTS</Text>
                      <Text style={styles.contractText}>
                        The Employee shall be entitled to paid annual leave in accordance with the Labour Act [Chapter 28:01] of Zimbabwe, currently 24 working days per year.
                      </Text>

                      <Text style={styles.contractSectionHeader}>7. TERMINATION</Text>
                      <Text style={styles.contractText}>
                        Either party may terminate this contract by giving {contractForm.termination_notice || '30 days'} written notice.
                      </Text>

                      <Text style={styles.contractSectionHeader}>8. GOVERNING LAW</Text>
                      <Text style={styles.contractText}>
                        This Contract shall be governed by the laws of Zimbabwe and subject to the jurisdiction of the Zimbabwean courts.
                      </Text>
                    </View>

                    {/* Signatures Section */}
                    <View style={styles.contractSignatures}>
                      <View style={styles.contractSignatureBlock}>
                        <Text style={styles.contractSignatureLabel}>Employer Signature:</Text>
                        <Text style={styles.contractSignatureLine}>___________________________</Text>
                        <Text style={styles.contractSignatureText}>
                          {contractForm.employer_signature || (shopData?.name || shopData?.shop_name || 'LUMINA BAKERY')}
                        </Text>
                        <Text style={styles.contractSignatureDate}>
                          Date: _______________
                        </Text>
                      </View>

                      <View style={styles.contractSignatureBlock}>
                        <Text style={styles.contractSignatureLabel}>Employee Signature:</Text>
                        <Text style={styles.contractSignatureLine}>___________________________</Text>
                        <Text style={styles.contractSignatureText}>
                          {contractForm.employee_signature || 'Employee Name'}
                        </Text>
                        <Text style={styles.contractSignatureDate}>
                          Date: _______________
                        </Text>
                      </View>

                      {contractForm.witness_name && (
                        <View style={styles.contractSignatureBlock}>
                          <Text style={styles.contractSignatureLabel}>Witness Signature:</Text>
                          <Text style={styles.contractSignatureLine}>___________________________</Text>
                          <Text style={styles.contractSignatureText}>
                            {contractForm.witness_name}
                          </Text>
                          <Text style={styles.contractSignatureDate}>
                            Date: _______________
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Footer */}
                    <View style={styles.contractFooter}>
                      <Text style={styles.contractFooterText}>
                        This contract constitutes the entire agreement between the parties.
                      </Text>
                      <Text style={styles.contractFooterText}>
                        Generated on {new Date().toLocaleDateString()} by Lumina Bakery Management System
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              </Animated.View>
            ) : (
              /* Contract Form Editor */
              <ScrollView
                style={styles.contractModalContent}
                contentContainerStyle={styles.contractModalContentContainer}
                showsVerticalScrollIndicator={true}
                bounces={true}
                keyboardShouldPersistTaps="handled"
              >
                {/* Contract Status */}
                <View style={styles.contractStatusContainer}>
                  <View style={[styles.contractStatusBadge, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                    <Text style={styles.contractStatusBadgeText}>📝 DRAFT CONTRACT</Text>
                  </View>
                </View>

                {/* Contract Form Sections */}
                <View style={styles.contractSection}>
                  <Text style={styles.contractSectionTitle}>📋 Position Details</Text>
                  <Text style={styles.contractFieldLabel}>Position Title *</Text>
                  <TextInput
                    style={styles.contractInput}
                    value={contractForm.position_title}
                    onChangeText={(text) => setContractForm({...contractForm, position_title: text})}
                    placeholder="e.g., Senior Cashier, Store Manager"
                    placeholderTextColor="#999"
                  />

                  <Text style={styles.contractFieldLabel}>Department</Text>
                  <TextInput
                    style={styles.contractInput}
                    value={contractForm.department}
                    onChangeText={(text) => setContractForm({...contractForm, department: text})}
                    placeholder="e.g., Sales, Admin, Operations"
                    placeholderTextColor="#999"
                  />

                  <Text style={styles.contractFieldLabel}>Employment Type</Text>
                  <TextInput
                    style={styles.contractInput}
                    value={contractForm.employment_type}
                    onChangeText={(text) => setContractForm({...contractForm, employment_type: text})}
                    placeholder="Full-time, Part-time, Contract"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.contractSection}>
                  <Text style={styles.contractSectionTitle}>📅 Employment Period</Text>
                  <Text style={styles.contractFieldLabel}>Start Date *</Text>
                  <TextInput
                    style={styles.contractInput}
                    value={contractForm.start_date}
                    onChangeText={(text) => setContractForm({...contractForm, start_date: text})}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#999"
                  />

                  <Text style={styles.contractFieldLabel}>End Date</Text>
                  <TextInput
                    style={styles.contractInput}
                    value={contractForm.end_date}
                    onChangeText={(text) => setContractForm({...contractForm, end_date: text})}
                    placeholder="YYYY-MM-DD (leave empty for permanent)"
                    placeholderTextColor="#999"
                  />

                  <Text style={styles.contractFieldLabel}>Probation Period</Text>
                  <TextInput
                    style={styles.contractInput}
                    value={contractForm.probation_period}
                    onChangeText={(text) => setContractForm({...contractForm, probation_period: text})}
                    placeholder="e.g., 3 months"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.contractSection}>
                  <Text style={styles.contractSectionTitle}>💰 Compensation</Text>
                  <Text style={styles.contractFieldLabel}>Salary Amount</Text>
                  <TextInput
                    style={styles.contractInput}
                    value={contractForm.salary_amount}
                    onChangeText={(text) => setContractForm({...contractForm, salary_amount: text})}
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                  />

                  <Text style={styles.contractFieldLabel}>Currency</Text>
                  <TextInput
                    style={styles.contractInput}
                    value={contractForm.salary_currency}
                    onChangeText={(text) => setContractForm({...contractForm, salary_currency: text})}
                    placeholder="USD, ZIG"
                    placeholderTextColor="#999"
                  />

                  <Text style={styles.contractFieldLabel}>Payment Frequency</Text>
                  <TextInput
                    style={styles.contractInput}
                    value={contractForm.payment_frequency}
                    onChangeText={(text) => setContractForm({...contractForm, payment_frequency: text})}
                    placeholder="Weekly, Bi-weekly, Monthly"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.contractSection}>
                  <Text style={styles.contractSectionTitle}>🕒 Work Schedule</Text>
                  <Text style={styles.contractFieldLabel}>Work Schedule</Text>
                  <TextInput
                    style={styles.contractInput}
                    value={contractForm.work_schedule}
                    onChangeText={(text) => setContractForm({...contractForm, work_schedule: text})}
                    placeholder="e.g., Monday-Friday 8AM-5PM"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.contractSection}>
                  <Text style={styles.contractSectionTitle}>🎁 Benefits & Terms</Text>
                  <Text style={styles.contractFieldLabel}>Benefits</Text>
                  <TextInput
                    style={[styles.contractInput, { height: 80, textAlignVertical: 'top' }]}
                    value={contractForm.benefits}
                    onChangeText={(text) => setContractForm({...contractForm, benefits: text})}
                    placeholder="Health insurance, Paid leave, etc."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={3}
                  />

                  <Text style={styles.contractFieldLabel}>Termination Notice</Text>
                  <TextInput
                    style={styles.contractInput}
                    value={contractForm.termination_notice}
                    onChangeText={(text) => setContractForm({...contractForm, termination_notice: text})}
                    placeholder="e.g., 30 days"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.contractSection}>
                  <Text style={styles.contractSectionTitle}>📝 Key Responsibilities</Text>
                  <Text style={styles.contractFieldLabel}>Primary Duties</Text>
                  <TextInput
                    style={[styles.contractInput, { height: 100, textAlignVertical: 'top' }]}
                    value={contractForm.responsibilities}
                    onChangeText={(text) => setContractForm({...contractForm, responsibilities: text})}
                    placeholder="List the main job responsibilities..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={styles.contractSection}>
                  <Text style={styles.contractSectionTitle}>⚖️ Additional Terms</Text>
                  <Text style={styles.contractFieldLabel}>Contract Terms</Text>
                  <TextInput
                    style={[styles.contractInput, { height: 120, textAlignVertical: 'top' }]}
                    value={contractForm.contract_terms}
                    onChangeText={(text) => setContractForm({...contractForm, contract_terms: text})}
                    placeholder="Additional legal terms and conditions..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={6}
                  />
                </View>

                <View style={styles.contractSection}>
                  <Text style={styles.contractSectionTitle}>✍️ Signatures</Text>
                  <Text style={styles.contractFieldLabel}>Employer Signature</Text>
                  <TextInput
                    style={styles.contractInput}
                    value={contractForm.employer_signature}
                    onChangeText={(text) => setContractForm({...contractForm, employer_signature: text})}
                    placeholder="Shop owner name"
                    placeholderTextColor="#999"
                  />

                  <Text style={styles.contractFieldLabel}>Employee Signature</Text>
                  <TextInput
                    style={styles.contractInput}
                    value={contractForm.employee_signature}
                    onChangeText={(text) => setContractForm({...contractForm, employee_signature: text})}
                    placeholder="Employee name"
                    placeholderTextColor="#999"
                  />

                  <Text style={styles.contractFieldLabel}>Witness Name (Optional)</Text>
                  <TextInput
                    style={styles.contractInput}
                    value={contractForm.witness_name}
                    onChangeText={(text) => setContractForm({...contractForm, witness_name: text})}
                    placeholder="Witness full name"
                    placeholderTextColor="#999"
                  />

                  <Text style={styles.contractFieldLabel}>Witness Signature</Text>
                  <TextInput
                    style={styles.contractInput}
                    value={contractForm.witness_signature}
                    onChangeText={(text) => setContractForm({...contractForm, witness_signature: text})}
                    placeholder="Witness signature"
                    placeholderTextColor="#999"
                  />
                </View>
              </ScrollView>
            )}

            <View style={styles.contractModalFooter}>
              <TouchableOpacity
                style={styles.contractCancelButton}
                onPress={() => setShowContractModal(false)}
              >
                <Text style={styles.contractCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              {showContractPreview ? (
                <TouchableOpacity
                  style={styles.contractShareButton}
                  onPress={saveContract}
                  disabled={contractLoading}
                >
                  {contractLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.contractShareButtonText}>📤 Share Document</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.contractPreviewButtonLarge}
                  onPress={handlePreviewContract}
                >
                  <Text style={styles.contractPreviewButtonTextLarge}>👁️ Preview Document</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0a0a0a' 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  backButton: { color: '#3b82f6', fontSize: 16 },
  refreshButton: { color: '#3b82f6', fontSize: 18 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSpacer: { width: 40 },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    color: '#3b82f6',
    fontSize: 12,
    marginHorizontal: 8,
    fontWeight: 'bold',
  },
  bulkModeButton: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelBulkButton: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#0a0a0a'
  },
  loadingText: { 
    color: '#fff', 
    marginTop: 16,
    fontSize: 16
  },
  content: { 
    flex: 1 
  },

  // Statistics Section
  statsContainer: {
    padding: 20,
  },
  sectionHeader: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    width: (width - 60) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  statIconContainer: {
    marginRight: 12,
  },
  statIcon: {
    fontSize: 24,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statTitle: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 2,
  },
  statSubtitle: {
    color: '#999',
    fontSize: 10,
    marginTop: 2,
  },

  // Quick Actions Section
  quickActionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    width: (width - 50) / 2,
    marginBottom: 12,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  quickActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickActionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  quickActionTextContainer: {
    flex: 1,
  },
  quickActionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  quickActionDescription: {
    color: '#999',
    fontSize: 11,
    marginTop: 2,
  },

  // Search Section
  searchContainer: {
    padding: 20,
  },
  searchInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filterButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterButtonTextActive: {
    color: '#fff',
  },

  // Advanced Filters Styles
  advancedFiltersContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  advancedFiltersTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  advancedFilterRow: {
    marginBottom: 16,
  },
  advancedFilterGroup: {
    marginBottom: 8,
  },
  advancedFilterLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  advancedFilterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  advancedFilterButton: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  advancedFilterButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  advancedFilterButtonText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  advancedFilterButtonTextActive: {
    color: '#fff',
  },
  clearFiltersButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  clearFiltersButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Search Results Section
  searchResultsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchResultsScroll: {
    maxHeight: 400,
  },
  noResultsContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },

  // Recent Activity Section
  recentActivityContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  activityCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  activityItem: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },

  // Toggle Section
  toggleContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  toggleButton: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
    alignItems: 'center',
  },
  toggleButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Staff Card Styles
  staffCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  staffCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  staffAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  staffAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  staffEmail: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 2,
  },
  staffPhone: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 2,
  },
  staffShift: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  staffRole: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4,
  },
  staffDepartment: {
    color: '#999',
    fontSize: 12,
    marginBottom: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  pendingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  activeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  inactiveBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 2,
    marginVertical: 2,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  approveAction: {
    backgroundColor: '#10b981',
  },
  rejectAction: {
    backgroundColor: '#ef4444',
  },
  deactivateAction: {
    backgroundColor: '#f59e0b',
  },
  deleteAction: {
    backgroundColor: '#dc2626',
  },
  reactivateAction: {
    backgroundColor: '#8b5cf6',
  },
  quickEditAction: {
    backgroundColor: '#06b6d4',
  },
  contractAction: {
    backgroundColor: '#f97316',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#333',
  },
  staffListModalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#333',
  },
  contractModalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: '#333',
  },
  analyticsModalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: '#333',
  },
  directoryModalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 600,
    borderWidth: 1,
    borderColor: '#333',
  },
  performanceModalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 700,
    borderWidth: 1,
    borderColor: '#333',
  },
  editModalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalDescription: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },

  // Staff List Modal
  staffListContent: {
    flex: 1,
  },
  staffListContentContainer: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  closeModalButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Form Styles
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
  },

  // Contract Form
  contractFormContent: {
    flex: 1,
  },
  contractFormContentContainer: {
    paddingBottom: 20,
  },

  // Edit Form
  editFormContent: {
    flex: 1,
  },
  editFormContentContainer: {
    paddingBottom: 20,
  },

  // Analytics Styles
  analyticsContent: {
    flex: 1,
  },
  analyticsContentContainer: {
    paddingBottom: 20,
  },
  analyticsSection: {
    marginBottom: 24,
  },
  analyticsSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  analyticsStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  analyticsStatCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  analyticsStatNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  analyticsStatLabel: {
    color: '#ccc',
    fontSize: 12,
  },
  analyticsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  analyticsItemLabel: {
    color: '#fff',
    fontSize: 14,
  },
  analyticsItemValue: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  activityIcon: {
    fontSize: 16,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 2,
  },
  activityTime: {
    color: '#999',
    fontSize: 12,
  },

  // Directory Styles
  directoryContent: {
    flex: 1,
  },
  directoryContentContainer: {
    paddingBottom: 20,
  },
  directorySection: {
    marginBottom: 24,
  },
  directorySectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  directoryCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  directoryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  directoryAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  directoryAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  directoryInfo: {
    flex: 1,
  },
  directoryName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  directoryRole: {
    color: '#ccc',
    fontSize: 14,
  },
  directoryContact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  directoryContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 120,
  },
  directoryContactIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  directoryContactText: {
    color: '#ccc',
    fontSize: 12,
    flex: 1,
  },

  // Performance Dashboard Styles
  performanceContent: {
    flex: 1,
  },
  performanceContentContainer: {
    paddingBottom: 20,
  },
  performanceSummary: {
    marginBottom: 24,
  },
  performanceSummaryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  performanceSummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceSummaryCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    width: '31%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  performanceSummaryValue: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  performanceSummaryLabel: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
  },
  performanceStaffSection: {
    marginBottom: 24,
  },
  performanceSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  performanceStaffCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  performanceStaffHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  performanceStaffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  performanceStaffAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  performanceStaffInfo: {
    flex: 1,
  },
  performanceStaffName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  performanceStaffRole: {
    color: '#ccc',
    fontSize: 12,
  },
  performanceMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  performanceMetric: {
    alignItems: 'center',
    flex: 1,
  },
  performanceMetricValue: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  performanceMetricLabel: {
    color: '#999',
    fontSize: 10,
    textAlign: 'center',
  },
  performanceBar: {
    height: 8,
    backgroundColor: '#444',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  performanceBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  performanceBarLabel: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
  },
  emptyPerformance: {
    alignItems: 'center',
    padding: 40,
  },
  emptyPerformanceText: {
    color: '#999',
    fontSize: 16,
  },
  performanceDeptSection: {
    marginBottom: 24,
  },
  performanceDeptCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#444',
  },
  performanceDeptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceDeptName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  performanceDeptCount: {
    color: '#ccc',
    fontSize: 12,
  },
  performanceDeptMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceDeptMetric: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Comment Dialog
  commentInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 16,
    textAlignVertical: 'top',
  },

  // Modal Buttons
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.5,
  },

  // Details Modal
  detailsContent: {
    flex: 1,
  },
  detailsContentContainer: {
    paddingBottom: 20,
  },
  detailSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  detailLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  performanceTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  closeButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Contract Modal Styles
  contractModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contractModalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    width: '95%',
    maxWidth: 500,
    maxHeight: '95%',
    borderWidth: 1,
    borderColor: '#333',
  },
  contractModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  contractModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  contractModalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contractModalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contractModalContent: {
    flex: 1,
  },
  contractModalContentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  contractStatusContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  contractStatusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  contractStatusBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  contractSection: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#444',
  },
  contractSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  contractFieldLabel: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 'bold',
  },
  contractInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444',
    marginBottom: 16,
  },
  contractModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  contractCancelButton: {
    backgroundColor: '#6b7280',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  contractCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  contractShareButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginLeft: 8,
  },
  contractShareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Contract Document Preview Styles
  contractDocumentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  contractDocumentScroll: {
    flex: 1,
    width: '100%',
  },
  contractDocumentContent: {
    alignItems: 'center',
  },
  contractPaper: {
    backgroundColor: '#f8f4e8', // Vintage paper color
    borderRadius: 8,
    padding: 30,
    width: '100%',
    maxWidth: 600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#d4c4a8',
    position: 'relative',
    // Subtle paper texture effect
    borderStyle: 'solid',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  // Corner Decorations
  contractCornerTL: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  contractCornerTR: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  contractCornerBL: {
    position: 'absolute',
    bottom: 10,
    left: 10,
  },
  contractCornerBR: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  contractCornerSymbol: {
    fontSize: 16,
    color: '#8b4513',
    opacity: 0.6,
  },
  // Watermark
  contractWatermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -75 }, { translateY: -50 }],
    opacity: 0.05,
  },
  contractWatermarkText: {
    fontSize: 60,
    fontWeight: 'bold',
    color: '#8b4513',
    fontFamily: 'serif',
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#8b4513',
  },
  contractCompanyInfo: {
    flex: 1,
  },
  contractCompanyName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8b4513',
    marginBottom: 5,
    fontFamily: 'serif',
  },
  contractCompanyAddress: {
    fontSize: 12,
    color: '#654321',
    marginBottom: 2,
  },
  contractCompanyContact: {
    fontSize: 12,
    color: '#654321',
    marginBottom: 2,
  },
  contractLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8b4513',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#654321',
  },
  contractLogoText: {
    fontSize: 30,
    color: '#f8f4e8',
  },
  contractTitleSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  contractMainTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8b4513',
    textAlign: 'center',
    fontFamily: 'serif',
    marginBottom: 5,
  },
  contractSubtitle: {
    fontSize: 14,
    color: '#654321',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  contractDivider: {
    width: 100,
    height: 2,
    backgroundColor: '#8b4513',
    marginTop: 10,
  },
  contractParties: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  contractParty: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f0e6d2',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  contractPartyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8b4513',
    marginBottom: 8,
    textDecorationLine: 'underline',
  },
  contractPartyText: {
    fontSize: 12,
    color: '#654321',
    lineHeight: 18,
    marginBottom: 2,
  },
  contractBody: {
    marginBottom: 30,
  },
  contractDate: {
    fontSize: 14,
    color: '#654321',
    textAlign: 'right',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  contractSectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8b4513',
    marginTop: 15,
    marginBottom: 8,
    textDecorationLine: 'underline',
  },
  contractText: {
    fontSize: 12,
    color: '#654321',
    lineHeight: 18,
    marginBottom: 10,
    textAlign: 'justify',
  },
  contractSignatures: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#d4c4a8',
  },
  contractSignatureBlock: {
    marginBottom: 30,
  },
  contractSignatureLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8b4513',
    marginBottom: 20,
  },
  contractSignatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#8b4513',
    marginBottom: 5,
    width: 200,
  },
  contractSignatureText: {
    fontSize: 12,
    color: '#654321',
    fontStyle: 'italic',
  },
  contractSignatureDate: {
    fontSize: 12,
    color: '#654321',
    marginTop: 10,
  },
  contractFooter: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#d4c4a8',
    alignItems: 'center',
  },
  contractFooterText: {
    fontSize: 10,
    color: '#8b7355',
    textAlign: 'center',
    marginBottom: 2,
    fontStyle: 'italic',
  },

  // Header Actions
  contractModalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contractPreviewButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  contractPreviewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contractEditButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  contractEditButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contractPreviewButtonLarge: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    marginLeft: 8,
  },
  contractPreviewButtonTextLarge: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Bulk Actions Styles
  bulkActionsBar: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bulkActionsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bulkActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  bulkApproveButton: {
    backgroundColor: '#10b981',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  bulkRejectButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  bulkDeactivateButton: {
    backgroundColor: '#f59e0b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  bulkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bulkCheckbox: {
    marginRight: 12,
    padding: 4,
  },
  checkboxIcon: {
    fontSize: 20,
    color: '#666',
  },
  checkboxSelected: {
    color: '#3b82f6',
  },
});

export default StaffManagementScreen;
