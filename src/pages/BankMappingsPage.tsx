// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, Input, Button, Typography, Space, Tag, message } from "antd";
import { BankOutlined } from "@ant-design/icons";
import { supabase } from "../utils/supabase";
const { Title, Text } = Typography;

const BankMappingsPage = () => {
  const [isos, setIsos] = useState([]);
  const [bankMappings, setBankMappings] = useState([]);
  const [editingKeyword, setEditingKeyword] = useState({});
  const [savingKeyword, setSavingKeyword] = useState({});

  useEffect(() => { fetchIsos(); fetchBankMappings(); }, []);

  const fetchIsos = async () => {
    const { data } = await supabase.from('isos').select('id,name').eq('status','active').order('name');
    if (data) setIsos(data);
  };

  const fetchBankMappings = async () => {
    const { data } = await supabase.from('iso_bank_mappings').select('*,isos(id,name)').order('created_at');
    if (data) setBankMappings(data);
  };

  const mappingByIsoId = Object.fromEntries(bankMappings.map(m => [m.iso_id, m]));

  const saveKeyword = async (isoId, isoName) => {
    const kw = (editingKeyword[isoId] || '').trim();
    setSavingKeyword(p => ({ ...p, [isoId]: true }));
    try {
      const existing = bankMappings.find(m => m.iso_id === isoId);
      if (existing) {
        if (kw) {
          await supabase.from('iso_bank_mappings').update({ keywords: kw, updated_at: new Date().toISOString() }).eq('id', existing.id);
        } else {
          await supabase.from('iso_bank_mappings').delete().eq('id', existing.id);
        }
      } else if (kw) {
        await supabase.from('iso_bank_mappings').insert({ iso_id: isoId, keywords: kw });
      }
      await fetchBankMappings();
      setEditingKeyword(p => { const n = { ...p }; delete n[isoId]; return n; });
      message.success(`saved keywords for ${isoName}`);
    } catch (e) {
      message.error('Save failed: ' + e.message);
    } finally {
      setSavingKeyword(p => { const n = { ...p }; delete n[isoId]; return n; });
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <BankOutlined style={{ fontSize: 22, color: '#6ee7b7' }} />
        <Title level={4} style={{ margin: 0 }}>Bank Keyword Mappings</Title>
        <Tag style={{ background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0', fontWeight: 600 }}>
          {bankMappings.length} configured
        </Tag>
      </div>
      <Card>
        <Text style={{ fontSize: 13, color: '#6b7280', display: 'block', marginBottom: 16 }}>
          Map each ISO to the keywords that appear in your bank statements. When you run &ldquo;Sync from Bank&rdquo; on the Payments page, transactions matching these keywords
 will be matched to the corresponding ISO. Use comma-separated values for multiple keywords. Example:{
' '}<code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 3 }}>CARDWORKS, CARD WORKS</code>
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 32px' }}>
          {isos.map(iso => {
            const mapping = mappingByIsoId[iso.id];
            const currentKw = mapping?.keywords || '';
            const isEditing = editingKeyword[iso.id] !== undefined;
            const isSaving = savingKeyword[iso.id];
            return (
              <div key={iso.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <Text style={{ width: 160, fontSize: 13, fontWeight: 600, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={iso.name}>
                  {iso.name}
                </Text>
                {isEditing ? (
                  <Space size={4} style={{ flex: 1 }}>
                    <Input size="small" value={editingKeyword[iso.id]}
                      onChange={e => setEditingKeyword(p => ({ ...p, [iso.id]: e.target.value }))}
                      placeholder="e.g. CARDWORKS, CARD WORKS" style={{ fontSize: 12 }}
                      onPressEnter={() => saveKeyword(iso.id, iso.name)} autoFocus />
                    <Button size="small" type="primary" loading={isSaving} onClick={() => saveKeyword(iso.id, iso.name)}>&#10003;</Button>
                    <Button size="small" onClick={() => setEditingKeyword(p => { const n = { ...p }; delete n[iso.id]; return n; })}>&#10007;</Button>
                  </Space>
                ) : (
                  <div
                    style={{ flex: 1, cursor: 'pointer', padding: '4px 8px', borderRadius: 4, background: currentKw ? '#f0fdf4' : '#fafafa', border: currentKw ? '1px solid #bbf7d0' : '1px dashed #d1d5db', fontSize: 12, color: currentKw ? '#059669' : '#9ca3af', minHeight: 28, display: 'flex', alignItems: 'center' }}
                    onClick={() => setEditingKeyword(p => ({ ...p, [iso.id]: currentKw }))} title="Click to edit">
                    {currentKw || <span style={{ fontStyle: 'italic' }}>Click to add keywords...</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default BankMappingsPage;
