'use strict';

/**
 * src/config/supabase.js
 *
 * Centralized Supabase client and storage configuration.
 * Provides safe credentials access and environment reconciliation.
 */

function getSupabaseConfig(env = process.env) {
  const url = (env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const secretKey = (env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const bucket = (env.SUPABASE_STORAGE_BUCKET || 'Camso documents').trim();

  const isReady = Boolean(url && secretKey);

  return {
    url,
    secretKey,
    bucket,
    isReady,
  };
}

const activeConfig = getSupabaseConfig(process.env);

module.exports = {
  getSupabaseConfig,
  get isSupabaseReady() {
    return getSupabaseConfig(process.env).isReady;
  },
  get supabaseUrl() {
    return getSupabaseConfig(process.env).url;
  },
  get supabaseSecretKey() {
    return getSupabaseConfig(process.env).secretKey;
  },
  get supabaseBucket() {
    return getSupabaseConfig(process.env).bucket;
  },
};
