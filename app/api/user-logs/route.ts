import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/database';

interface UserLogRow {
  id: number;
  action_time: Date;
  action_type: string;
  table_name: string;
  record_id: number | null;
  description: string;
  ip_address: string | null;
  user_agent: string | null;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
}

interface CountResult {
  total: number;
}

// Helper type for MySQL query results
type QueryResult = [unknown[], unknown];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const actionType = searchParams.get('actionType');
    const search = searchParams.get('search');
    const exportCsv = searchParams.get('export') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build main query
    let query = `
      SELECT 
        ul.id,
        ul.action_time,
        ul.action_type,
        ul.table_name,
        ul.record_id,
        ul.description,
        ul.ip_address,
        ul.user_agent,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM user_log ul
      LEFT JOIN users u ON ul.user_id = u.id
      WHERE 1=1
    `;
    
    // Build count query
    let countQuery = `
      SELECT COUNT(*) as total
      FROM user_log ul
      LEFT JOIN users u ON ul.user_id = u.id
      WHERE 1=1
    `;
    
    const params: (string | number)[] = [];
    const countParams: (string | number)[] = [];
    
    // Add date filters
    if (dateFrom) {
      query += ` AND DATE(ul.action_time) >= ?`;
      countQuery += ` AND DATE(ul.action_time) >= ?`;
      params.push(dateFrom);
      countParams.push(dateFrom);
    }
    
    if (dateTo) {
      query += ` AND DATE(ul.action_time) <= ?`;
      countQuery += ` AND DATE(ul.action_time) <= ?`;
      params.push(dateTo);
      countParams.push(dateTo);
    }
    
    if (actionType) {
      query += ` AND ul.action_type = ?`;
      countQuery += ` AND ul.action_type = ?`;
      params.push(actionType);
      countParams.push(actionType);
    }
    
    if (search) {
      const searchTerm = `%${search}%`;
      query += ` AND (
        ul.description LIKE ? OR 
        ul.table_name LIKE ? OR 
        u.name LIKE ? OR 
        u.email LIKE ?
      )`;
      countQuery += ` AND (
        ul.description LIKE ? OR 
        ul.table_name LIKE ? OR 
        u.name LIKE ? OR 
        u.email LIKE ?
      )`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    query += ` ORDER BY ul.action_time DESC`;
    
    if (!exportCsv) {
      const offset = (page - 1) * limit;
      query += ` LIMIT ? OFFSET ?`;
      params.push(limit, offset);
    }
    
    // Execute queries with proper typing
    const [rows] = await pool.execute(query, params) as QueryResult;
    const [countRows] = await pool.execute(countQuery, countParams) as QueryResult;
    
    // Get total count - Type-safe way
    const countResult = countRows as CountResult[];
    const total = countResult.length > 0 ? countResult[0].total : 0;
    
    const logs = rows as UserLogRow[];
    
    if (exportCsv) {
      // Convert to CSV
      const headers = [
        'ID',
        'Action Time',
        'Action Type',
        'Table Name',
        'Record ID',
        'Description',
        'IP Address',
        'User Agent',
        'User Name',
        'User Email',
        'User Role'
      ].join(',');
      
      const csvRows = logs.map(log => [
        log.id,
        `"${new Date(log.action_time).toISOString()}"`,
        `"${log.action_type}"`,
        `"${log.table_name || ''}"`,
        log.record_id || '',
        `"${log.description.replace(/"/g, '""')}"`,
        `"${log.ip_address || ''}"`,
        `"${log.user_agent ? log.user_agent.replace(/"/g, '""') : ''}"`,
        `"${log.user_name || ''}"`,
        `"${log.user_email || ''}"`,
        `"${log.user_role || ''}"`
      ].join(','));
      
      const csv = [headers, ...csvRows].join('\n');
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="activity-logs-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }
    
    return NextResponse.json({ 
      logs, 
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(Number(total) / limit)
    });
    
  } catch (error) {
    console.error('Error fetching user logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user logs' },
      { status: 500 }
    );
  }
}