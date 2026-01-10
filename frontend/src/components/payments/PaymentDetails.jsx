import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Loading from '../common/Loading';
import {
  formatCurrency,
  formatDate,
  getPaymentStatusColor
} from '../../utils/formatters';

const PaymentDetails = ({ isOpen, onClose, paymentId }) => {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && paymentId) {
      fetchPaymentDetails();
    }
  }, [isOpen, paymentId]);

  const fetchPaymentDetails = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get(`/payments/${paymentId}`);
      setPayment(response.data);
    } catch (err) {
      console.error('Error fetching payment details:', err);
      setError(err.response?.data?.message || 'Failed to load payment details');
    } finally {
      setLoading(false);
    }
  };

  const downloadReceipt = () => {
    // TODO: Implement receipt download functionality
    alert('Receipt download functionality will be implemented');
  };

  const statusColor = payment ? getPaymentStatusColor(payment.status) : 'gray';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Payment Details"
      size="lg"
      footer={
        <>
          {payment && payment.status === 'Paid' && (
            <Button onClick={downloadReceipt} variant="secondary">
              Download Receipt
            </Button>
          )}
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </>
      }
    >
      {loading && <Loading />}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {payment && !loading && (
        <div className="space-y-6">
          {/* Payment Status Badge */}
          <div className="flex justify-between items-center">
            <span className={`px-4 py-2 inline-flex text-sm font-semibold rounded-full bg-${statusColor}-100 text-${statusColor}-800`}>
              {payment.status}
            </span>
            <div className="text-sm text-gray-500">
              Payment ID: {payment._id}
            </div>
          </div>

          {/* Member & Chit Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Member & Chit Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Member Name</div>
                <div className="text-base font-medium text-gray-900">
                  {payment.member?.name || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Member Phone</div>
                <div className="text-base font-medium text-gray-900">
                  {payment.member?.phone || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Chit Group</div>
                <div className="text-base font-medium text-gray-900">
                  {payment.chitGroup?.name || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Installment Month</div>
                <div className="text-base font-medium text-gray-900">
                  {payment.installmentMonth || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Amount Details */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Amount Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Amount Due</div>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(payment.amountDue || 0)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Amount Paid</div>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(payment.amountPaid || 0)}
                </div>
              </div>
              {payment.status === 'Partial' && (
                <div className="col-span-2">
                  <div className="text-sm text-gray-500">Outstanding Balance</div>
                  <div className="text-lg font-bold text-red-600">
                    {formatCurrency((payment.amountDue || 0) - (payment.amountPaid || 0))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Date Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Date Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Due Date</div>
                <div className="text-base font-medium text-gray-900">
                  {formatDate(payment.dueDate)}
                </div>
              </div>
              {payment.paymentDate && (
                <div>
                  <div className="text-sm text-gray-500">Payment Date</div>
                  <div className="text-base font-medium text-gray-900">
                    {formatDate(payment.paymentDate)}
                  </div>
                </div>
              )}
              {payment.gracePeriodEnd && (
                <div>
                  <div className="text-sm text-gray-500">Grace Period End</div>
                  <div className="text-base font-medium text-gray-900">
                    {formatDate(payment.gracePeriodEnd)}
                  </div>
                </div>
              )}
              {payment.delayDays > 0 && (
                <div>
                  <div className="text-sm text-gray-500">Delay Days</div>
                  <div className="text-base font-medium text-red-600">
                    {payment.delayDays} days
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Transaction Details */}
          {payment.status !== 'Pending' && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Transaction Details</h4>
              <div className="grid grid-cols-2 gap-4">
                {payment.paymentMethod && (
                  <div>
                    <div className="text-sm text-gray-500">Payment Method</div>
                    <div className="text-base font-medium text-gray-900">
                      {payment.paymentMethod}
                    </div>
                  </div>
                )}
                {payment.transactionRef && (
                  <div>
                    <div className="text-sm text-gray-500">Transaction Reference</div>
                    <div className="text-base font-medium text-gray-900">
                      {payment.transactionRef}
                    </div>
                  </div>
                )}
                {payment.recordedBy && (
                  <div>
                    <div className="text-sm text-gray-500">Recorded By</div>
                    <div className="text-base font-medium text-gray-900">
                      {payment.recordedBy?.name || 'N/A'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Partial Payments Breakdown */}
          {payment.partialPayments && payment.partialPayments.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Partial Payments History ({payment.partialPayments.length})
              </h4>
              <div className="space-y-2">
                {payment.partialPayments.map((partial, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-white rounded border border-gray-200"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(partial.amount)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(partial.date)} - {partial.method}
                      </div>
                      {partial.transactionRef && (
                        <div className="text-xs text-gray-400">
                          Ref: {partial.transactionRef}
                        </div>
                      )}
                    </div>
                    {partial.recordedBy && (
                      <div className="text-xs text-gray-500">
                        By: {partial.recordedBy.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Total Paid:</span>
                  <span className="text-base font-bold text-green-600">
                    {formatCurrency(
                      payment.partialPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {payment.notes && (
            <div className="bg-yellow-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
              <p className="text-sm text-gray-900">{payment.notes}</p>
            </div>
          )}

          {/* Payment Timeline */}
          {payment.paymentHistory && payment.paymentHistory.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Timeline</h4>
              <div className="space-y-3">
                {payment.paymentHistory.map((history, index) => (
                  <div key={index} className="flex items-start">
                    <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {history.action}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(history.date, true)} by {history.user?.name || 'System'}
                      </div>
                      {history.details && (
                        <div className="text-xs text-gray-600 mt-1">
                          {history.details}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* On-time Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">On-time Payment:</span>
            <span className={`font-semibold ${payment.isOnTime ? 'text-green-600' : 'text-red-600'}`}>
              {payment.isOnTime ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PaymentDetails;
