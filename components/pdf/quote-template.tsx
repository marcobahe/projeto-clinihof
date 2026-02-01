import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import { formatCurrency } from '@/lib/utils';

// Registrar fontes (opcional - usando fontes padrão)
Font.register({
  family: 'Roboto',
  src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf',
});

// Estilos para o PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottom: '2 solid #9333ea',
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 120,
    maxHeight: 60,
    marginRight: 15,
    objectFit: 'contain' as any,
  },
  headerText: {
    flex: 1,
  },
  clinicName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#9333ea',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9333ea',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: '30%',
    fontWeight: 'bold',
    color: '#333',
  },
  value: {
    width: '70%',
    color: '#555',
  },
  table: {
    marginTop: 10,
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    fontWeight: 'bold',
    borderBottom: '1 solid #d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #e5e7eb',
  },
  tableCol1: {
    width: '50%',
  },
  tableCol2: {
    width: '15%',
    textAlign: 'center',
  },
  tableCol3: {
    width: '17.5%',
    textAlign: 'right',
  },
  tableCol4: {
    width: '17.5%',
    textAlign: 'right',
    fontWeight: 'bold',
  },
  totalsSection: {
    marginTop: 20,
    marginLeft: 'auto',
    width: '50%',
    borderTop: '2 solid #9333ea',
    paddingTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  finalTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1 solid #d1d5db',
    fontWeight: 'bold',
    fontSize: 14,
    color: '#9333ea',
  },
  notes: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#faf5ff',
    borderLeft: '3 solid #9333ea',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 8,
    paddingTop: 10,
    borderTop: '1 solid #e5e7eb',
  },
  validityWarning: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#fef3c7',
    borderLeft: '3 solid #f59e0b',
    fontSize: 9,
  },
});

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface QuoteData {
  clinicName: string;
  clinicLogo?: string;
  professionalName: string;
  patientName: string;
  patientPhone?: string;
  patientEmail?: string;
  quoteNumber: string;
  createdDate: string;
  expirationDate?: string;
  items: QuoteItem[];
  totalAmount: number;
  discountPercent: number;
  discountAmount: number;
  finalAmount: number;
  notes?: string;
  leadSource?: string;
}

interface QuoteTemplateProps {
  data: QuoteData;
}

export const QuoteTemplate: React.FC<QuoteTemplateProps> = ({ data }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          {data.clinicLogo && (
            <Image style={styles.headerLogo} src={data.clinicLogo} />
          )}
          <View style={styles.headerText}>
            <Text style={styles.clinicName}>{data.clinicName}</Text>
            <Text style={styles.subtitle}>Orçamento Personalizado</Text>
            <Text style={styles.subtitle}>Nº {data.quoteNumber}</Text>
          </View>
        </View>

        {/* Informações Gerais */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Data de Emissão:</Text>
            <Text style={styles.value}>{formatDate(data.createdDate)}</Text>
          </View>
          {data.expirationDate && (
            <View style={styles.row}>
              <Text style={styles.label}>Válido até:</Text>
              <Text style={styles.value}>{formatDate(data.expirationDate)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Profissional:</Text>
            <Text style={styles.value}>{data.professionalName}</Text>
          </View>
          {data.leadSource && (
            <View style={styles.row}>
              <Text style={styles.label}>Origem:</Text>
              <Text style={styles.value}>{data.leadSource}</Text>
            </View>
          )}
        </View>

        {/* Dados do Paciente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cliente</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nome:</Text>
            <Text style={styles.value}>{data.patientName}</Text>
          </View>
          {data.patientPhone && (
            <View style={styles.row}>
              <Text style={styles.label}>Telefone:</Text>
              <Text style={styles.value}>{data.patientPhone}</Text>
            </View>
          )}
          {data.patientEmail && (
            <View style={styles.row}>
              <Text style={styles.label}>E-mail:</Text>
              <Text style={styles.value}>{data.patientEmail}</Text>
            </View>
          )}
        </View>

        {/* Procedimentos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Procedimentos</Text>
          <View style={styles.table}>
            {/* Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.tableCol1}>Descrição</Text>
              <Text style={styles.tableCol2}>Qtd</Text>
              <Text style={styles.tableCol3}>Valor Unit.</Text>
              <Text style={styles.tableCol4}>Total</Text>
            </View>
            {/* Rows */}
            {data.items.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCol1}>{item.description}</Text>
                <Text style={styles.tableCol2}>{item.quantity}</Text>
                <Text style={styles.tableCol3}>{formatCurrency(item.unitPrice)}</Text>
                <Text style={styles.tableCol4}>{formatCurrency(item.totalPrice)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Totais */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text>Subtotal:</Text>
            <Text>{formatCurrency(data.totalAmount)}</Text>
          </View>
          {data.discountPercent > 0 && (
            <View style={styles.totalRow}>
              <Text>Desconto ({data.discountPercent.toFixed(1).replace('.', ',')}%):</Text>
              <Text>- {formatCurrency(data.discountAmount)}</Text>
            </View>
          )}
          <View style={styles.finalTotal}>
            <Text>VALOR FINAL:</Text>
            <Text>{formatCurrency(data.finalAmount)}</Text>
          </View>
        </View>

        {/* Observações */}
        {data.notes && (
          <View style={styles.notes}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Observações:</Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        {/* Aviso de Validade */}
        {data.expirationDate && (
          <View style={styles.validityWarning}>
            <Text>
              ⚠️ Este orçamento é válido até {formatDate(data.expirationDate)}. Após esta data,
              os valores e condições podem ser alterados.
            </Text>
          </View>
        )}

        {/* Rodapé */}
        <View style={styles.footer}>
          <Text>
            Documento gerado automaticamente por {data.clinicName}
          </Text>
          <Text>
            {formatDate(new Date().toISOString())} - {data.clinicName}
          </Text>
        </View>
      </Page>
    </Document>
  );
};
