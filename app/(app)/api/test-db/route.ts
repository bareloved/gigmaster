import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    console.log('Testing database connection...');
    const supabase = await createClient();

    // Simple test query
    const { data, error } = await supabase
      .from('gigs')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('Database connection successful, found', data?.length || 0, 'gigs');
    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      gigsCount: data?.length || 0
    });
  } catch (error) {
    console.error('Connection test failed:', error);
    return NextResponse.json({
      error: 'Connection failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

