import React from 'react';
import { View, Text, TextInput } from 'react-native';

const InputField = ({ label, icon, placeholder, error, ...props }) => (
  <View className="mb-5">
    <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">{label} *</Text>
    <View className={`flex-row items-center bg-gray-50 border ${error ? 'border-red-300' : 'border-gray-200'} rounded-2xl px-4 h-12`}>
      {icon && <View className="mr-3">{icon}</View>}
      <TextInput className="flex-1 text-gray-900 placeholder:text-gray-400" placeholder={placeholder} {...props} />
    </View>
    {error && <Text className="text-red-600 text-sm mt-1 ml-1">{error}</Text>}
  </View>
);

export default InputField;