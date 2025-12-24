# Fix Input Issues in RegisterScreen and Verify LoginScreen

## Tasks
- [ ] Convert RegisterScreen from ref-based to state-based input management
- [ ] Update getFormData to use state instead of refs
- [x] Update InputField component to use value and onChangeText props
- [ ] Verify LoginScreen works correctly (uses state properly)
- [ ] Test registration functionality after changes

## Details
The RegisterScreen currently uses refs incorrectly with React Native TextInput components, which don't have a .value property. This causes inputs to be uncontrolled, leading to slow typing and automatic deletion of values. Need to convert to controlled components using useState, similar to LoginScreen pattern.
