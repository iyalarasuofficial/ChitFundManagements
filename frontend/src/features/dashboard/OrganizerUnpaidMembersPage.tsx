import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { dashboardService } from '../../services/dashboardService';
import { getClientErrorMessage } from '../../utils/error';

type UnpaidMemberRow = {
  groupId: number;
  groupName: string;
  memberId: number;
  memberName: string;
  memberPhone?: string;
  unpaidAmount: number;
  penaltyAmount: number;
  amountDue: number;
  amountPaid: number;
};

export const OrganizerUnpaidMembersPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<UnpaidMemberRow[]>([]);
  const [groupOptions, setGroupOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await dashboardService.getOrganizerDashboard();
      const groups = Array.isArray(response.data?.groups) ? response.data.groups : [];

      const nextRows: UnpaidMemberRow[] = [];
      const options: Array<{ id: string; name: string }> = [];

      for (const group of groups) {
        options.push({ id: String(group.groupId), name: group.name });
        for (const member of group.unpaidMembers || []) {
          nextRows.push({
            groupId: group.groupId,
            groupName: group.name,
            memberId: member.memberId,
            memberName: member.memberName,
            memberPhone: member.memberPhone,
            unpaidAmount: Number(member.unpaidAmount || 0),
            penaltyAmount: Number(member.penaltyAmount || 0),
            amountDue: Number(member.amountDue || 0),
            amountPaid: Number(member.amountPaid || 0),
          });
        }
      }

      setGroupOptions(options);
      setRows(nextRows);
    } catch (err: any) {
      setError(getClientErrorMessage(err, 'Unable to load unpaid members right now.'));
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (selectedGroupId === 'all') return rows;
    return rows.filter((row) => String(row.groupId) === selectedGroupId);
  }, [rows, selectedGroupId]);

  const totalUnpaid = filteredRows.reduce((sum, row) => sum + row.unpaidAmount, 0);

  const handleExportCsv = () => {
    if (filteredRows.length === 0) return;

    const headers = [
      'Group',
      'Member Name',
      'Phone',
      'Amount Due',
      'Amount Paid',
      'Penalty',
      'Unpaid Amount',
    ];

    const csvRows = filteredRows.map((row) => [
      row.groupName,
      row.memberName,
      row.memberPhone || '',
      row.amountDue.toFixed(2),
      row.amountPaid.toFixed(2),
      row.penaltyAmount.toFixed(2),
      row.unpaidAmount.toFixed(2),
    ]);

    const content = [headers, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'unpaid-members.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="w-full max-w-sm mx-auto bg-white min-h-screen flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.1)]">
        <div className="bg-gradient-to-r from-tms-secondary to-tms-secondary-light text-white px-4 py-6 flex justify-between items-center rounded-b-2xl shadow-md">
          <h1 className="text-xl font-bold">Unpaid Members</h1>
        </div>
        <div className="flex-1 pb-24 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-tms-primary animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto bg-white min-h-screen flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.1)]">
      <div className="sticky top-0 z-40 bg-gradient-to-r from-tms-secondary to-tms-secondary-light text-white px-4 py-6 flex justify-between items-center rounded-b-2xl shadow-md">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          title="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Unpaid Members</h1>
        <button
          onClick={handleExportCsv}
          disabled={filteredRows.length === 0}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-60"
          title="Export CSV"
        >
          <Download size={20} />
        </button>
      </div>

      <div className="flex-1 pb-24 px-4 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <label className="block text-xs font-medium text-gray-700 mb-1">Filter By Group</label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-tms-primary focus:outline-none focus:ring-2 focus:ring-tms-primary/10"
          >
            <option value="all">All Groups</option>
            {groupOptions.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>

          <p className="text-sm text-gray-700 mt-3">
            Total Unpaid: <span className="font-bold text-amber-700">₹{totalUnpaid.toLocaleString()}</span>
          </p>
        </div>

        {filteredRows.length === 0 ? (
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm text-center py-8 text-gray-500">
            No unpaid members found
          </div>
        ) : (
          <div className="space-y-2">
            {filteredRows.map((row) => (
              <div key={`${row.groupId}-${row.memberId}`} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <p className="font-semibold text-gray-800">{row.memberName}</p>
                <p className="text-xs text-gray-500">{row.groupName}</p>
                <p className="text-xs text-gray-500">{row.memberPhone || '-'}</p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <p>Due: ₹{row.amountDue.toLocaleString()}</p>
                  <p>Paid: ₹{row.amountPaid.toLocaleString()}</p>
                  <p>Penalty: ₹{row.penaltyAmount.toLocaleString()}</p>
                  <p className="font-semibold text-amber-700">Unpaid: ₹{row.unpaidAmount.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
