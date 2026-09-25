// @ts-nocheck
import { useEffect, useState } from "react";
import { Card, Input, Button, Typography, Space, Tag, message, Modal, Select } from "antd";
import { BankOutlined, PlusOutlined } from "@ant-design/icons";
import { supabase } from "../utils/supabase";
const { Title, Text } = Typography;

const BankMappingsPage = () => {
  const [isos, setIsos] = useState([]);
  const [bankMappings, setBankMappings] = useState([]);
  const [editingKeyword, setEditingKeyword] = useState({});
  const [savingKeyword, setSavingKeyword] = useState({});
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ iso_id: '', keywords: '' });
  const [addSaving, setAddSaving] = useState(false);

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

  const saveNewMapping = async () => {
    if (!addForm.iso_id) { message.warning('Please select an ISO'); return; }
    if (!addForm.keywords.trim()) { message.warning('Please enter at least one keyword'); return; }
    setAddSaving(true);
    try {
      const existing = bankMappings.find(m => m.iso_id === addForm.iso_id);
      if (existing) {
        await supabase.from('iso_bank_mappings').update({ keywords: addForm.keywords.trim(), updated_at: new Date().toISOString() }).eq('id', existing.id);
      } else {
        await supabase.from('iso_bank_mappings').insert({ iso_id: addForm.iso_id, keywords: addForm.keywords.trim() });
      }
      await fetchBankMappings();
      const isoName = isos.find(i => i.id === addForm.iso_id)?.name || '';
      message.success(`Mapping saved for ${isoName}`);
      setAddModalOpen(false);
      setAddForm({ iso_id: '', keywords: '' });
    } catch (e) {
      message.error('Save failed: ' + e.message);
    } finally {
      setAddSaving(false);
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
        <div style={{ marginLeft: 'auto' }}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setAddForm({ iso_id: '', keywords: '' }); setAddModalOpen(true); }}>
            Add Mapping
          </Button>
        </div>
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

      <Modal
        title={<Space><BankOutlined style={{ color: '#6ee7b7' }} /><span>Add Bank Mapping</span></Space>}
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); setAddForm({ iso_id: '', keywords: '' }); }}
        onOk={saveNewMapping}
        okText="Save Mapping"
        confirmLoading={addSaving}
        okButtonProps={{ disabled: !addForm.iso_id || !addForm.keywords.trim() }}
        width={480}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 0' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>ISO</Text>
            <Select
              showSearch
              placeholder="Select an ISO..."
              style={{ width: '100%' }}
              value={addForm.iso_id || undefined}
              onChange={val => {
                const existing = mappingByIsoId[val];
                setAddForm(p => ({ ...p, iso_id: val, keywords: existing?.keywords || '' }));
              }}
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              options={isos.map(iso => ({
                value: iso.id,
                label: iso.name,
                disabled: false,
              }))}
            />
            {addForm.iso_id && mappingByIsoId[addForm.iso_id] && (
              <Text style={{ fontSize: 12, color: '#f59e0b', marginTop: 4, display: 'block' }}>
                This ISO already has a mapping — saving will overwrite the existing keywords.
              </Text>
            )}
          </div>
          <div>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>Keywords</Text>
            <Input.TextArea
              rows={3}
              placeholder="e.g. CARDWORKS, CARD WORKS, CW MERCHANT"
              value={addForm.keywords}
              onChange={e => setAddForm(p => ({ ...p, keywords: e.target.value }))}
              style={{ fontSize: 13 }}
            />
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4, display: 'block' }}>
              Comma-separated. These strings are matched against bank statement descriptions.
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default BankMappingsPage;