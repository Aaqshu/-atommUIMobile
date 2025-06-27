import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { X, Square, CheckSquare } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

type ReportIssueModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (issues: string[], otherDetails: string) => void;
  questionId: string;
};

const issueOptions = [
  'Question not belongs to this chapter',
  'Question not Belongs to this Subtopic',
  'Issue in Question',
  'Issue in Options',
  'Issue in Correct option',
  'Issue in Solution',
  'Out of Syllabus',
  'Other',
];

export default function ReportIssueModal({ visible, onClose, onSubmit, questionId }: ReportIssueModalProps) {
  const { colors } = useTheme();
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [otherDetails, setOtherDetails] = useState('');

  const handleToggleIssue = (issue: string) => {
    setSelectedIssues(prev =>
      prev.includes(issue) ? prev.filter(i => i !== issue) : [...prev, issue]
    );
  };

  const isSubmitDisabled = () => {
    if (selectedIssues.length === 0) return true;
    if (selectedIssues.includes('Other') && otherDetails.trim() === '') {
      return true;
    }
    return false;
  };

  const handleSubmit = () => {
    onSubmit(selectedIssues, otherDetails);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.header}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Report an Issue</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            {issueOptions.map(issue => (
              <TouchableOpacity
                key={issue}
                style={styles.option}
                onPress={() => handleToggleIssue(issue)}
              >
                {selectedIssues.includes(issue) ? (
                  <CheckSquare size={20} color={colors.primary} />
                ) : (
                  <Square size={20} color={colors.textSecondary} />
                )}
                <Text style={[styles.optionText, { color: colors.text }]}>{issue}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedIssues.includes('Other') && (
            <TextInput
              style={[styles.textInput, { borderColor: colors.border, color: colors.text }]}
              placeholder="Please provide details..."
              placeholderTextColor={colors.textSecondary}
              value={otherDetails}
              onChangeText={setOtherDetails}
              multiline
            />
          )}

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: isSubmitDisabled() ? '#ccc' : colors.primary }]}
            onPress={handleSubmit}
            disabled={isSubmitDisabled()}
          >
            <Text style={styles.submitButtonText}>Submit Report</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    borderRadius: 20,
    padding: 25,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  optionsContainer: {
    marginBottom: 15,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  optionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginLeft: 15,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitButton: {
    borderRadius: 10,
    padding: 15,
    elevation: 2,
  },
  submitButtonText: {
    color: 'white',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    fontSize: 16,
  },
}); 