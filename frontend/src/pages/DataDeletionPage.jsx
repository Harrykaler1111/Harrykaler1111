import { Mail, Shield } from "lucide-react";

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-neutral-50 pt-20 pb-16 px-4" data-testid="data-deletion-page">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 p-8 sm:p-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">
              Data Deletion Instructions
            </h1>
          </div>

          <div className="w-12 h-[2px] bg-neutral-200 mb-8" />

          <p className="text-neutral-600 text-base leading-relaxed mb-6">
            If any user wants to delete their data from our system, they can request it by contacting us at{" "}
            <a
              href="mailto:paramjeetpigma@gmail.com"
              className="text-gold hover:underline font-medium inline-flex items-center gap-1"
              data-testid="deletion-email-link"
            >
              <Mail className="h-4 w-4" />
              paramjeetpigma@gmail.com
            </a>.
          </p>

          <p className="text-neutral-600 text-base leading-relaxed">
            We will process and delete all associated data within <strong className="text-neutral-900">48 hours</strong> of receiving the request.
          </p>

          <div className="mt-10 pt-6 border-t border-neutral-100">
            <p className="text-xs text-neutral-400">
              Pigma &mdash; Your privacy matters to us.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
