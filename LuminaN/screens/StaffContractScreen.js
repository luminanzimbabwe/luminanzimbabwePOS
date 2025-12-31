import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, StyleSheet, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import shopStorage from '../services/storage';

const StaffContractScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { staffMember } = route.params || {};

  const [shopCredentials, setShopCredentials] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);
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
    employer_signature: '',
    employee_signature: '',
    witness_name: ''
  });

  useEffect(() => {
    if (shopCredentials && staffMember) {
      loadContractData();
    }
  }, [shopCredentials, staffMember]);

  const loadContractData = async () => {
    try {
      const credentials = await shopStorage.getCredentials();
      setShopCredentials(credentials);

      // Pre-fill contract form with staff data
      const today = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      const endDateStr = endDate.toISOString().split('T')[0];

      setContractForm({
        position_title: staffMember.role || 'Cashier',
        department: staffMember.department || 'Sales',
        employment_type: 'Full-time',
        start_date: today,
        end_date: endDateStr,
        salary_amount: staffMember.salary_amount?.toString() || '',
        salary_currency: staffMember.salary_currency || 'USD',
        payment_frequency: 'Monthly',
        work_schedule: staffMember.preferred_shift || 'To be determined',
        probation_period: '3 months',
        benefits: 'Health insurance, Paid leave, Staff discount',
        responsibilities: 'Handle customer transactions, Maintain cash register, Provide excellent customer service, Assist with inventory management',
        employer_signature: shopCredentials?.name || 'Shop Owner',
        employee_signature: staffMember.name,
        witness_name: '',
      });
    } catch (error) {
      console.error('Error loading contract data:', error);
    }
  };

  const generateContractText = () => {
    const staff = staffMember;
    if (!staff) return '';

    return `
EMPLOYMENT CONTRACT

This Employment Contract is entered into on ${contractForm.start_date} between:

EMPLOYER: ${shopCredentials?.name || 'Shop Owner'}
Email: ${shopCredentials?.email || 'Not provided'}

EMPLOYEE: ${staff.name}
Email: ${staff.email || 'Not provided'}
Phone: ${staff.phone}

1. POSITION AND EMPLOYMENT
The Employer agrees to employ the Employee as a ${contractForm.position_title} in the ${contractForm.department} department. This is a ${contractForm.employment_type} position commencing on ${contractForm.start_date} and ending on ${contractForm.end_date} (or until terminated).

2. COMPENSATION AND BENEFITS
2.1 Salary: The Employee shall receive a gross salary of ${contractForm.salary_amount || '0'} ${contractForm.salary_currency || 'USD'} payable ${contractForm.payment_frequency}.
2.2 Benefits: ${contractForm.benefits || 'Health insurance, Paid annual leave, Staff discount on products'}
2.3 The salary is subject to statutory deductions including PAYE, ZIMRA contributions, and any other lawful deductions.

3. HOURS OF WORK
3.1 Work Schedule: ${contractForm.work_schedule || 'Monday to Friday, 8:00 AM to 5:00 PM, with breaks as required by law'}
3.2 The Employee may be required to work additional hours or different shifts as business needs require, with appropriate compensation.

4. DUTIES AND RESPONSIBILITIES
${contractForm.responsibilities || 'The Employee agrees to perform all duties as directed by the Employer and to maintain confidentiality of all business information.'}

5. PROBATION PERIOD
The Employee will serve a probation period of ${contractForm.probation_period} from the date of commencement. During this period, either party may terminate the employment with one week's notice.

6. TERMINATION
6.1 Either party may terminate this employment with two weeks' written notice.
6.2 The Employer reserves the right to terminate employment immediately for gross misconduct.

7. CONFIDENTIALITY
The Employee agrees to maintain strict confidentiality of all business information, customer data, and trade secrets.

8. GOVERNING LAW
This contract shall be governed by the laws of Zimbabwe.

By signing below, both parties agree to the terms and conditions set forth in this contract.

EMPLOYER: ${shopCredentials?.name || 'Shop Owner'}    EMPLOYEE: ${staff.name}

Signature: ________________    Signature: ________________

Date: ${contractForm.start_date}        Date: ${contractForm.start_date}

WITNESS: ${contractForm.witness_name || 'N/A'}
Signature: ________________
    `;
  };

  const handleGenerateContract = () => {
    const contractText = generateContractText();
    setShowContractModal(true);
  };

  const handleShareContract = async () => {
    try {
      const contractText = generateContractText();
      
      // In a real app, you would use a sharing library like react-native-share
      Alert.alert(
        'Contract Generated',
        'Contract has been generated successfully! You can now share or print it.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to generate contract');
    }
  };

  if (!staffMember) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Employment Contract</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No staff member provided</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {staffMember ? `Contract - ${staffMember.name}` : 'Employment Contract'}
        </Text>
        <TouchableOpacity onPress={handleGenerateContract}>
          <Text style={styles.generateButton}>📄 Generate</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Staff Information</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{staffMember.name}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{staffMember.email || 'Not provided'}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{staffMember.phone}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Role:</Text>
            <Text style={styles.infoValue}>{staffMember.role || 'Cashier'}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💼 Contract Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Position Title</Text>
            <TextInput
              style={styles.input}
              value={contractForm.position_title}
              onChangeText={(text) => setContractForm({...contractForm, position_title: text})}
              placeholder="e.g., Cashier, Supervisor"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Department</Text>
            <TextInput
              style={styles.input}
              value={contractForm.department}
              onChangeText={(text) => setContractForm({...contractForm, department: text})}
              placeholder="e.g., Sales, Admin"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Employment Type</Text>
            <TextInput
              style={styles.input}
              value={contractForm.employment_type}
              onChangeText={(text) => setContractForm({...contractForm, employment_type: text})}
              placeholder="e.g., Full-time, Part-time"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Start Date</Text>
            <TextInput
              style={styles.input}
              value={contractForm.start_date}
              onChangeText={(text) => setContractForm({...contractForm, start_date: text})}
              placeholder="YYYY-MM-DD"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Salary Amount</Text>
            <TextInput
              style={styles.input}
              value={contractForm.salary_amount}
              onChangeText={(text) => setContractForm({...contractForm, salary_amount: text})}
              placeholder="0.00"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Salary Currency</Text>
            <TextInput
              style={styles.input}
              value={contractForm.salary_currency}
              onChangeText={(text) => setContractForm({...contractForm, salary_currency: text})}
              placeholder="USD"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Work Schedule</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={contractForm.work_schedule}
              onChangeText={(text) => setContractForm({...contractForm, work_schedule: text})}
              placeholder="e.g., Monday-Friday 8AM-5PM"
              multiline
            />
          </View>
        </View>

        <TouchableOpacity style={styles.generateButtonContainer} onPress={handleGenerateContract}>
          <Text style={styles.generateButtonText}>📄 Generate Employment Contract</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Contract Preview Modal */}
      <Modal
        visible={showContractModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowContractModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowContractModal(false)}>
              <Text style={styles.modalCloseButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Employment Contract</Text>
            <TouchableOpacity onPress={handleShareContract}>
              <Text style={styles.modalShareButton}>Share</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.contractText}>
              {generateContractText()}
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    color: '#3b82f6',
    fontSize: 16,
  },
  generateButton: {
    color: '#10b981',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    color: '#ccc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  generateButtonContainer: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    color: '#3b82f6',
    fontSize: 16,
  },
  modalShareButton: {
    color: '#10b981',
    fontSize: 16,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  contractText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
});

export default StaffContractScreen;