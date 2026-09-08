import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AlertCircle, CheckCircle } from 'lucide-react';

export function VerifyPage() {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (code.length !== 6) {
      setError('Verification code must be 6 digits');
      return;
    }

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1000);
  };

  if (isSuccess) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">
          Account Verified
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          Your account has been successfully verified. You can now sign in.
        </p>
        <Link to="/login">
          <Button className="w-full justify-center">
            Go to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        <h3 className="text-xl font-medium text-gray-900">
          Verify your email
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          We've sent a 6-digit verification code to your email.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {error}
                </h3>
              </div>
            </div>
          </div>
        )}

        <div>
          <Input
            id="code"
            type="text"
            label="Verification code"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            className="text-center tracking-widest text-lg"
          />
        </div>

        <div>
          <Button
            type="submit"
            className="w-full justify-center"
            disabled={isSubmitting || code.length !== 6}
          >
            {isSubmitting ? 'Verifying...' : 'Verify'}
          </Button>
        </div>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-gray-500">Didn't receive the code? </span>
        <button className="font-medium text-blue-600 hover:text-blue-500">
          Resend code
        </button>
      </div>
    </div>
  );
}
