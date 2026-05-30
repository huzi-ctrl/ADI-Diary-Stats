import React, { useState, useMemo } from 'react';
import type { CalendarEvent } from '../utils/icsParser';
import { Search, MapPin, Calendar, Clock, ChevronLeft, ChevronRight, CheckCircle2, ShieldAlert } from 'lucide-react';

interface EventListProps {
  instructorEvents: CalendarEvent[];
  filteredOutEvents: CalendarEvent[];
  weekInstructorEvents: CalendarEvent[];
  weekFilteredOutEvents: CalendarEvent[];
  weekStart: Date;
  weekEnd: Date;
}

export const EventList: React.FC<EventListProps> = ({ 
  instructorEvents, 
  filteredOutEvents,
  weekInstructorEvents,
  weekFilteredOutEvents,
  weekStart,
  weekEnd
}) => {
  const [activeTab, setActiveTab] = useState<'lessons' | 'personal'>('lessons');
  const [showAllWeeks, setShowAllWeeks] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [eventType, setEventType] = useState<'ALL' | 'TIMED' | 'ALL_DAY'>('ALL');
  const [sortBy, setSortBy] = useState<'START_DESC' | 'START_ASC' | 'DUR_DESC' | 'DUR_ASC'>('START_DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Decide the source array based on active tab and history filter toggle
  const activeEventsSource = useMemo(() => {
    if (showAllWeeks) {
      return activeTab === 'lessons' ? instructorEvents : filteredOutEvents;
    } else {
      return activeTab === 'lessons' ? weekInstructorEvents : weekFilteredOutEvents;
    }
  }, [showAllWeeks, activeTab, instructorEvents, filteredOutEvents, weekInstructorEvents, weekFilteredOutEvents]);

  // Extract unique categories based on active source
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    activeEventsSource.forEach(e => {
      e.categories.forEach(c => cats.add(c));
    });
    return Array.from(cats).sort();
  }, [activeEventsSource]);

  // Filter and Sort events
  const filteredAndSortedEvents = useMemo(() => {
    let result = [...activeEventsSource];

    // Search term filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.summary.toLowerCase().includes(term) || 
        e.description.toLowerCase().includes(term) ||
        e.location.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (selectedCategory !== 'ALL') {
      result = result.filter(e => e.categories.includes(selectedCategory));
    }

    // Event type filter
    if (eventType === 'TIMED') {
      result = result.filter(e => !e.isAllDay);
    } else if (eventType === 'ALL_DAY') {
      result = result.filter(e => e.isAllDay);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'START_DESC') return b.start.getTime() - a.start.getTime();
      if (sortBy === 'START_ASC') return a.start.getTime() - b.start.getTime();
      if (sortBy === 'DUR_DESC') return b.durationMinutes - a.durationMinutes;
      if (sortBy === 'DUR_ASC') return a.durationMinutes - b.durationMinutes;
      return 0;
    });

    return result;
  }, [activeEventsSource, searchTerm, selectedCategory, eventType, sortBy]);

  const handleTabChange = (tab: 'lessons' | 'personal') => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchTerm('');
    setSelectedCategory('ALL');
  };

  // Pagination calculation
  const totalItems = filteredAndSortedEvents.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedEvents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedEvents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedEvents, currentPage]);

  const formatDate = (date: Date, isAllDay: boolean) => {
    if (isAllDay) {
      return date.toLocaleDateString(undefined, { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
    }
    return date.toLocaleDateString(undefined, { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDuration = (mins: number, isAllDay: boolean) => {
    if (isAllDay) return 'All Day';
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
    }
    return `${mins} mins`;
  };

  const formatWeekDate = (d: Date) => {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Tab Switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', gap: '1.5rem', paddingBottom: '0.25rem' }}>
        <button
          type="button"
          onClick={() => handleTabChange('lessons')}
          style={{
            background: 'none',
            border: 'none',
            paddingBottom: '0.75rem',
            borderBottom: activeTab === 'lessons' ? '2px solid var(--accent-indigo)' : '2px solid transparent',
            color: activeTab === 'lessons' ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'var(--transition-smooth)'
          }}
        >
          <CheckCircle2 size={16} style={{ color: activeTab === 'lessons' ? 'var(--accent-emerald)' : 'var(--text-dim)' }} />
          Driving Schedule ({activeTab === 'lessons' ? activeEventsSource.length : (showAllWeeks ? instructorEvents.length : weekInstructorEvents.length)})
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('personal')}
          style={{
            background: 'none',
            border: 'none',
            paddingBottom: '0.75rem',
            borderBottom: activeTab === 'personal' ? '2px solid var(--accent-pink)' : '2px solid transparent',
            color: activeTab === 'personal' ? 'var(--text-main)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'var(--transition-smooth)'
          }}
        >
          <ShieldAlert size={16} style={{ color: activeTab === 'personal' ? 'var(--accent-pink)' : 'var(--text-dim)' }} />
          Filtered Out Personal ({activeTab === 'personal' ? activeEventsSource.length : (showAllWeeks ? filteredOutEvents.length : weekFilteredOutEvents.length)})
        </button>
      </div>

      {/* Week Navigator Scope / Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'rgba(255, 255, 255, 0.015)', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.85rem', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 500 }}>
          <input 
            type="checkbox" 
            checked={showAllWeeks} 
            onChange={(e) => {
              setShowAllWeeks(e.target.checked);
              setCurrentPage(1);
              setSearchTerm('');
              setSelectedCategory('ALL');
            }} 
            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-indigo)' }}
          />
          Show full calendar history (ignore week selection)
        </label>
        
        {!showAllWeeks ? (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing week of: <strong>{formatWeekDate(weekStart)} &ndash; {formatWeekDate(weekEnd)}</strong>
          </span>
        ) : (
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-indigo)', fontWeight: 600 }}>
            Showing full history
          </span>
        )}
      </div>

      {/* Info notice about current view */}
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        {activeTab === 'lessons' 
          ? `Showing driving lessons, pupil sessions, theory test preps, and professional ADI CPD workshops.`
          : `Showing excluded personal calendar blocks, doctor, gym, rest days, holidays, and chores.`}
      </p>

      {/* Filters Control Panel */}
      <div className="filters-section">
        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', flexGrow: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-dim)' }} />
          <input
            type="text"
            className="search-input"
            style={{ paddingLeft: '2.5rem' }}
            placeholder={`Search active list...`}
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>

        {/* Category Filter */}
        <select 
          className="select-input" 
          value={selectedCategory} 
          onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
        >
          <option value="ALL">All Categories</option>
          {categoriesList.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Event Type Filter */}
        <select 
          className="select-input" 
          value={eventType} 
          onChange={(e) => { setEventType(e.target.value as 'ALL' | 'TIMED' | 'ALL_DAY'); setCurrentPage(1); }}
        >
          <option value="ALL">All Event Types</option>
          <option value="TIMED">Timed Events Only</option>
          <option value="ALL_DAY">All Day Events Only</option>
        </select>

        {/* Sort Filter */}
        <select 
          className="select-input" 
          value={sortBy} 
          onChange={(e) => { setSortBy(e.target.value as 'START_DESC' | 'START_ASC' | 'DUR_DESC' | 'DUR_ASC'); setCurrentPage(1); }}
        >
          <option value="START_DESC">Date: Newest First</option>
          <option value="START_ASC">Date: Oldest First</option>
          <option value="DUR_DESC">Duration: Longest First</option>
          <option value="DUR_ASC">Duration: Shortest First</option>
        </select>
      </div>

      {/* Events Table */}
      <div className="table-wrapper">
        <table className="event-table">
          <thead>
            <tr>
              <th style={{ width: '40%' }}>Event Details</th>
              <th style={{ width: '25%' }}>Date & Time</th>
              <th style={{ width: '15%' }}>Duration</th>
              <th style={{ width: '20%' }}>Categories</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEvents.length > 0 ? (
              paginatedEvents.map(e => (
                <tr key={e.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{e.summary}</div>
                    {e.description && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', marginBottom: '0.4rem', maxHeight: '60px', overflowY: 'auto' }}>
                        {e.description}
                      </div>
                    )}
                    {e.location && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <MapPin size={12} />
                        <span>{e.location}</span>
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                      <Calendar size={14} style={{ color: 'var(--accent-indigo)' }} />
                      <span>{formatDate(e.start, e.isAllDay)}</span>
                    </div>
                    {!e.isAllDay && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: '1.25rem', marginTop: '0.15rem' }}>
                        to {formatDate(e.end, e.isAllDay).split(',').slice(-1)[0]}
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                      <Clock size={14} style={{ color: 'var(--accent-purple)' }} />
                      <span>{formatDuration(e.durationMinutes, e.isAllDay)}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {e.categories.length > 0 ? (
                        e.categories.map(c => {
                          const lower = c.toLowerCase();
                          const badgeClass = 
                            lower.includes('lesson') ? 'badge-work' :
                            lower.includes('test') ? 'badge-fitness' :
                            lower.includes('training') || lower.includes('cpd') ? 'badge-social' :
                            lower.includes('personal') || lower.includes('break') || lower.includes('medical') ? 'badge-personal' :
                            'badge-default';
                          return (
                            <span key={c} className={`badge ${badgeClass}`} style={{ fontSize: '0.65rem' }}>
                              {c}
                            </span>
                          );
                        })
                      ) : (
                        <span className="badge badge-default" style={{ fontSize: '0.65rem' }}>
                          {activeTab === 'lessons' ? 'Instruction' : 'Personal'}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No events found in this view matching search filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Event Cards Layout (shown only on small screens via CSS) */}
      <div className="event-cards-mobile">
        {paginatedEvents.length > 0 ? (
          paginatedEvents.map(e => (
            <div key={`mob-${e.id}`} className="glass-card" style={{ padding: '1rem', border: '1px solid var(--border-medium)', background: 'var(--bg-nested)' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem', fontSize: '1.05rem' }}>{e.summary}</div>
              
              {e.description && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', marginBottom: '0.5rem', maxHeight: '80px', overflowY: 'auto' }}>
                  {e.description}
                </div>
              )}
              
              {e.location && (
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
                  <MapPin size={14} />
                  <span>{e.location}</span>
                </div>
              )}
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem', borderTop: '1px solid var(--border-light)', paddingTop: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <Calendar size={14} style={{ color: 'var(--accent-indigo)' }} />
                  <span>{formatDate(e.start, e.isAllDay)}</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <Clock size={14} style={{ color: 'var(--accent-purple)' }} />
                  <span>{formatDuration(e.durationMinutes, e.isAllDay)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.75rem' }}>
                {e.categories.length > 0 ? (
                  e.categories.map(c => {
                    const lower = c.toLowerCase();
                    const badgeClass = 
                      lower.includes('lesson') ? 'badge-work' :
                      lower.includes('test') ? 'badge-fitness' :
                      lower.includes('training') || lower.includes('cpd') ? 'badge-social' :
                      lower.includes('personal') || lower.includes('break') || lower.includes('medical') ? 'badge-personal' :
                      'badge-default';
                    return (
                      <span key={c} className={`badge ${badgeClass}`} style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}>
                        {c}
                      </span>
                    );
                  })
                ) : (
                  <span className="badge badge-default" style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}>
                    {activeTab === 'lessons' ? 'Instruction' : 'Personal'}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No events found in this view matching search filters.
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Page <strong>{currentPage}</strong> of {totalPages} (Total in view: {totalItems})
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
