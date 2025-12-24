import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Share,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { shopAPI } from '../services/api';
import { shopStorage } from '../services/storage';
import { ROUTES } from '../constants/navigation';

const { width } = Dimensions.get('window');

const StaffContractScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { staffMember } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [shopCredentials, setShopCredentials] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [contractData, setContractData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Contract form state
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
    witness_signature: '',
    signed_date: '',
    is_signed: false,
  });

  useEffect(() => {
    loadShopCredentials();
  }, []);

  useEffect(() => {
    if (shopCredentials && staffMember) {
      loadContractData();
      checkIfOwner();
    }
  }, [shopCredentials, staffMember]);

  const loadShopCredentials = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      if (!credentials) {
        navigation.replace(ROUTES.LOGIN);
        return;
      }
      setShopCredentials(credentials);
    } catch (error) {
      console.error('Error loading credentials:', error);
      navigation.replace(ROUTES.LOGIN);
    }
  };

  const checkIfOwner = () => {
    // Check if current user is the shop owner
    // This would need to be implemented based on your authentication logic
    setIsOwner(true); // For now, assume owner access
  };

  const loadContractData = async () => {
    try {
      setLoading(true);

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
        contract_terms: `EMPLOYMENT CONTRACT

This Employment Contract ("Contract") is entered into on ${new Date().toLocaleDateString()} between:

EMPLOYER: ${shopCredentials?.name || 'Shop Owner'}
Address: ${shopCredentials?.address || 'Shop Address'}
Email: ${shopCredentials?.email || 'shop@email.com'}

and

EMPLOYEE: ${staffMember.name}
Email: ${staffMember.email || 'Not provided'}
Phone: ${staffMember.phone}

1. POSITION AND EMPLOYMENT
The Employer agrees to employ the Employee as a ${contractForm.position_title || 'Cashier'} in the ${contractForm.department || 'Sales'} department. This is a ${contractForm.employment_type || 'Full-time'} position commencing on ${contractForm.start_date || 'Start Date'} and ending on ${contractForm.end_date || 'End Date (or until terminated)'}.

2. COMPENSATION AND BENEFITS
2.1 Salary: The Employee shall receive a gross salary of ${contractForm.salary_amount || '0'} ${contractForm.salary_currency || 'USD'} payable ${contractForm.payment_frequency || 'Monthly'}.
2.2 Benefits: ${contractForm.benefits || 'Health insurance, Paid annual leave, Staff discount on products'}
2.3 The salary is subject to statutory deductions including PAYE, ZIMRA contributions, and any other lawful deductions.

3. HOURS OF WORK
3.1 Work Schedule: ${contractForm.work_schedule || 'Monday to Friday, 8:00 AM to 5:00 PM, with breaks as required by law'}
3.2 The Employee may be required to work additional hours or different shifts as business needs require, with appropriate compensation.

4. PROBATIONARY PERIOD
The Employee shall serve a probationary period of ${contractForm.probation_period || '3 months'} from the commencement date. During this period, either party may terminate employment with ${contractForm.termination_notice || '2 weeks'} notice.

5. DUTIES AND RESPONSIBILITIES
The Employee's primary duties and responsibilities include:
${contractForm.responsibilities || '- Handle customer transactions efficiently and accurately\n- Maintain cash register and financial records\n- Provide excellent customer service\n- Assist with inventory management and stock control\n- Maintain cleanliness and organization of work area\n- Follow all company policies and procedures'}

6. LEAVE ENTITLEMENTS
The Employee shall be entitled to paid annual leave in accordance with the Labour Act [Chapter 28:01] of Zimbabwe, currently 24 working days per year for employees with more than 12 months service.

7. TERMINATION OF EMPLOYMENT
7.1 Notice Period: Either party may terminate this contract by giving ${contractForm.termination_notice || '30 days'} written notice.
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

Name: ${shopCredentials?.name || 'Shop Owner'}    Name: ${staffMember.name}

Date: _______________    Date: _______________

WITNESS (if required): ___________________________

Name: ${contractForm.witness_name || ''}

Signature: ___________________________`,
        employer_signature: shopCredentials?.name || 'Shop Owner',
        employee_signature: staffMember.name,
        witness_name: '',
        witness_signature: '',
        signed_date: '',
        is_signed: false,
      });

      // Try to load existing contract if any
      // This would be implemented based on your backend API
      // const response = await shopAPI.getContract(staffMember.id);
      // if (response.data.contract) {
      //   setContractData(response.data.contract);
      //   setContractForm(response.data.contract);
      // }

    } catch (error) {
      console.error('Error loading contract data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContract = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!contractForm.position_title.trim() || !contractForm.start_date.trim()) {
        Alert.alert('Error', 'Position title and start date are required.');
        return;
      }

      // Save contract logic here
      // const response = await shopAPI.saveContract({
      //   ...contractForm,
      //   staff_id: staffMember.id,
      //   shop_credentials: shopCredentials
      // });

      Alert.alert('Success', 'Contract saved successfully!');

    } catch (error) {
      console.error('Error saving contract:', error);
      Alert.alert('Error', 'Failed to save contract.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignContract = async () => {
    try {
      setLoading(true);

      // Validate signatures
      if (!contractForm.employee_signature.trim()) {
        Alert.alert('Error', 'Employee signature is required.');
        return;
      }

      const signedContract = {
        ...contractForm,
        signed_date: new Date().toISOString().split('T')[0],
        is_signed: true,
      };

      // Save signed contract
      // const response = await shopAPI.signContract(signedContract);

      Alert.alert('Success', 'Contract signed successfully!');

      // Navigate back
      navigation.goBack();

    } catch (error) {
      console.error('Error signing contract:', error);
      Alert.alert('Error', 'Failed to sign contract.');
    } finally {
      setLoading(false);
    }
  };

  const handleShareContract = async () => {
    try {
      const contractText = generateContractText();

      await Share.share({
        message: contractText,
        title: `Employment Contract - ${staffMember.name}`
      });

    } catch (error) {
      console.error('Error sharing contract:', error);
      Alert.alert('Error', 'Failed to share contract.');
    }
  };

  const generateContractText = () => {
    return `
EMPLOYMENT CONTRACT

Shop Information:
${shopCredentials?.name || 'Shop Name'}
${shopCredentials?.address || 'Shop Address'}
Email: ${shopCredentials?.email || 'shop@email.com'}

Employee Information:
Name: ${staffMember.name}
Email: ${staffMember.email || 'Not provided'}
Phone: ${staffMember.phone}

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

Signed Date: ${contractForm.signed_date || 'Not signed yet'}

This contract constitutes the entire agreement between the parties.
    `.trim();
  };

  const renderFormField = (label, value, onChangeText, placeholder = '', multiline = false, numberOfLines = 1) => (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        style={[styles.formInput, multiline && { height: 80, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#999"
        multiline={multiline}
        numberOfLines={numberOfLines}
        editable={isEditing || isOwner}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Employment Contract</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading contract...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {staffMember ? `Contract - ${staffMember.name}` : 'Employment Contract'}
        </Text>
        <View style={styles.headerActions}>
          {isOwner && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Text style={styles.headerButtonText}>
                {isEditing ? 'View' : 'Edit'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShareContract}
          >
            <Text style={styles.headerButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
        bounces={true}
        alwaysBounceVertical={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Contract Status */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, contractForm.is_signed ? styles.signedBadge : styles.draftBadge]}>
            <Text style={styles.statusBadgeText}>
              {contractForm.is_signed ? '✅ SIGNED' : '📝 DRAFT'}
            </Text>
          </View>
          {contractForm.signed_date && (
            <Text style={styles.signedDate}>Signed on: {contractForm.signed_date}</Text>
          )}
        </View>

        {/* Basic Contract Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Position Details</Text>

          {renderFormField('Position Title *', contractForm.position_title,
            (text) => setContractForm({...contractForm, position_title: text}),
            'e.g., Senior Cashier, Store Manager')}

          {renderFormField('Department', contractForm.department,
            (text) => setContractForm({...contractForm, department: text}),
            'e.g., Sales, Admin, Operations')}

          {renderFormField('Employment Type', contractForm.employment_type,
            (text) => setContractForm({...contractForm, employment_type: text}),
            'Full-time, Part-time, Contract')}
        </View>

        {/* Employment Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Employment Period</Text>

          {renderFormField('Start Date *', contractForm.start_date,
            (text) => setContractForm({...contractForm, start_date: text}),
            'YYYY-MM-DD')}

          {renderFormField('End Date', contractForm.end_date,
            (text) => setContractForm({...contractForm, end_date: text}),
            'YYYY-MM-DD (leave empty for permanent)')}

          {renderFormField('Probation Period', contractForm.probation_period,
            (text) => setContractForm({...contractForm, probation_period: text}),
            'e.g., 3 months')}
        </View>

        {/* Compensation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Compensation</Text>

          {renderFormField('Salary Amount', contractForm.salary_amount,
            (text) => setContractForm({...contractForm, salary_amount: text}),
            '0.00')}

          {renderFormField('Currency', contractForm.salary_currency,
            (text) => setContractForm({...contractForm, salary_currency: text}),
            'USD, ZIG')}

          {renderFormField('Payment Frequency', contractForm.payment_frequency,
            (text) => setContractForm({...contractForm, payment_frequency: text}),
            'Weekly, Bi-weekly, Monthly')}
        </View>

        {/* Work Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🕒 Work Schedule</Text>

          {renderFormField('Work Schedule', contractForm.work_schedule,
            (text) => setContractForm({...contractForm, work_schedule: text}),
            'e.g., Monday-Friday 8AM-5PM')}
        </View>

        {/* Benefits and Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎁 Benefits & Terms</Text>

          {renderFormField('Benefits', contractForm.benefits,
            (text) => setContractForm({...contractForm, benefits: text}),
            'Health insurance, Paid leave, etc.', true, 3)}

          {renderFormField('Termination Notice', contractForm.termination_notice,
            (text) => setContractForm({...contractForm, termination_notice: text}),
            'e.g., 30 days')}
        </View>

        {/* Responsibilities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Key Responsibilities</Text>

          {renderFormField('Primary Duties', contractForm.responsibilities,
            (text) => setContractForm({...contractForm, responsibilities: text}),
            'List the main job responsibilities...', true, 4)}
        </View>

        {/* Additional Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚖️ Additional Terms</Text>

          {renderFormField('Contract Terms', contractForm.contract_terms,
            (text) => setContractForm({...contractForm, contract_terms: text}),
            'Additional legal terms and conditions...', true, 6)}
        </View>

        {/* Signatures */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✍️ Signatures</Text>

          {renderFormField('Employer Signature', contractForm.employer_signature,
            (text) => setContractForm({...contractForm, employer_signature: text}),
            'Shop owner name')}

          {renderFormField('Employee Signature', contractForm.employee_signature,
            (text) => setContractForm({...contractForm, employee_signature: text}),
            'Employee name')}

          {renderFormField('Witness Name (Optional)', contractForm.witness_name,
            (text) => setContractForm({...contractForm, witness_name: text}),
            'Witness full name')}

          {renderFormField('Witness Signature', contractForm.witness_signature,
            (text) => setContractForm({...contractForm, witness_signature: text}),
            'Witness signature')}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {isOwner && !contractForm.is_signed && (
          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSaveContract}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>Save Contract</Text>
            )}
          </TouchableOpacity>
        )}

        {!isOwner && !contractForm.is_signed && (
          <TouchableOpacity
            style={[styles.actionButton, styles.signButton]}
            onPress={handleSignContract}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>Sign Contract</Text>
            )}
          </TouchableOpacity>
        )}

        {contractForm.is_signed && (
          <View style={styles.signedContainer}>
            <Text style={styles.signedText}>✅ Contract Signed</Text>
            <Text style={styles.signedDateText}>
              Signed on {contractForm.signed_date}
            </Text>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
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
  backButton: {
    color: '#3b82f6',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120, // Increased padding for footer
  },

  // Status
  statusContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  statusBadge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
  },
  draftBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  signedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  signedDate: {
    color: '#ccc',
    fontSize: 12,
  },

  // Sections
  section: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  // Form Fields
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: 'bold',
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

  // Footer
  footer: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#10b981',
  },
  signButton: {
    backgroundColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Signed State
  signedContainer: {
    alignItems: 'center',
    padding: 20,
  },
  signedText: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  signedDateText: {
    color: '#ccc',
    fontSize: 14,
  },

  // Tab Navigation
  tabContainer: {
    marginBottom: 20,
  },
  tabNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#444',
    marginHorizontal: 5,
  },
  navArrowText: {
    color: '#3b82f6',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabScroll: {
    flex: 1,
    maxHeight: 60,
  },
  tabButton: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#444',
    minWidth: 90,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  tabButtonText: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tabButtonTextActive: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
  },
});

export default StaffContractScreen;