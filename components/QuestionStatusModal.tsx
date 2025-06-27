import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { CheckCircle, Eye, Flag, X, HelpCircle } from 'lucide-react-native';

interface QuestionStatusModalProps {
  visible: boolean;
  onClose: () => void;
  statusData: {
    attempted: number;
    seen: number;
    unseen: number;
    marked: number;
    correctScore: number;
    incorrectScore: number;
  };
  questions: {
    number: number;
    status: 'attempted' | 'seen' | 'unseen';
    marked?: boolean;
    selected?: boolean;
  }[];
  title: string;
}

const QuestionStatusModal: React.FC<QuestionStatusModalProps> = ({
  visible,
  onClose,
  statusData,
  questions,
  title,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Question Status</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#222" />
            </TouchableOpacity>
          </View>

          {/* Scoring */}
          <View style={styles.scoringBox}>
            <Text style={styles.scoringTitle}>Scoring</Text>
            <View style={styles.scoringRow}>
              <Text style={styles.correctText}>Correct Answer: <Text style={styles.plusScore}>+{statusData.correctScore}</Text></Text>
              <Text style={styles.incorrectText}>Incorrect Answer: <Text style={styles.minusScore}>{statusData.incorrectScore}</Text></Text>
            </View>
          </View>

          {/* Status summary */}
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <CheckCircle size={20} color="#22c55e" />
              <Text style={styles.statusAttempted}>Attempted: {statusData.attempted}</Text>
            </View>
            <View style={styles.statusItem}>
              <Eye size={20} color="#2563eb" />
              <Text style={styles.statusSeen}>Seen: {statusData.seen}</Text>
            </View>
            <View style={styles.statusItem}>
              <HelpCircle size={20} color="#64748b" />
              <Text style={styles.statusUnseen}>Unseen: {statusData.unseen}</Text>
            </View>
            <View style={styles.statusItem}>
              <Flag size={20} color="#eab308" />
              <Text style={styles.statusMarked}>Marked: {statusData.marked}</Text>
            </View>
          </View>

          {/* Question grid */}
          <Text style={styles.sectionTitle}>{title}</Text>
          <ScrollView contentContainerStyle={styles.gridContainer}>
            <View style={styles.grid}>
              {questions.map((q) => (
                <View
                  key={q.number}
                  style={[styles.qBox,
                    q.status === 'attempted' && styles.qAttempted,
                    q.status === 'seen' && styles.qSeen,
                    q.marked && styles.qMarked,
                    q.selected && styles.qSelected,
                  ]}
                >
                  <Text style={styles.qNumber}>{q.number}</Text>
                  {q.marked && <Flag size={14} color="#eab308" style={styles.flagIcon} />}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '92%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    maxHeight: '90%',
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
  },
  closeButton: {
    padding: 4,
  },
  scoringBox: {
    backgroundColor: '#eef4ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  scoringTitle: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  scoringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  correctText: {
    color: '#22c55e',
    fontWeight: '500',
  },
  plusScore: {
    color: '#22c55e',
    fontWeight: 'bold',
  },
  incorrectText: {
    color: '#ef4444',
    fontWeight: '500',
  },
  minusScore: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusAttempted: {
    color: '#22c55e',
    fontSize: 13,
    marginTop: 2,
  },
  statusSeen: {
    color: '#2563eb',
    fontSize: 13,
    marginTop: 2,
  },
  statusUnseen: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  statusMarked: {
    color: '#eab308',
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#334155',
    fontSize: 16,
    marginVertical: 8,
  },
  gridContainer: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    width: '100%',
  },
  qBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    position: 'relative',
  },
  qAttempted: {
    backgroundColor: '#d1fae5',
  },
  qSeen: {
    backgroundColor: '#dbeafe',
  },
  qMarked: {
    borderWidth: 2,
    borderColor: '#eab308',
  },
  qSelected: {
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  qNumber: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 16,
  },
  flagIcon: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
});

export default QuestionStatusModal; 