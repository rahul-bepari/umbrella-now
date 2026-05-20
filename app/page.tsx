'use client';
import { useState, useEffect } from 'react';

function getScore(pop: number, humidity: number, clouds: number) {
  return Math.round((pop * 0.6 + (humidity / 100) * 0.2 + (clouds / 100) * 0.2) * 100);
}

function getDecision(score: number) {
  if (score >= 60) return { text: 'Dangerous', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  if (score >= 35) return { text: 'Moderate', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' };
  return { text: 'Safe', color: '#34d399', bg: 'rgba(52,211,153,0.15)' };
}

function getWeatherBg(desc: string) {
  if (!desc) return ['#1a1a2e', '#16213e'];
  const d = desc.toLowerCase();
  if (d.includes('thunder') || d.includes('storm')) return ['#0d0d1a', '#1a0a2e'];
  if (d.includes('rain') || d.includes('drizzle')) return ['#0f1923', '#1a2a3a'];
  if (d.includes('cloud')) return ['#1a1a2e', '#2d3748'];
  if (d.includes('clear')) return ['#0f3460', '#16213e'];
  return ['#1a1a2e', '#16213e'];
}

function getWeatherEmoji(desc: string) {
  if (!desc) return '🌡️';
  const d = desc.toLowerCase();
  if (d.includes('thunder')) return '⛈️';
  if (d.includes('rain')) return '🌧️';
  if (d.includes('drizzle')) return '🌦️';
  if (d.includes('snow')) return '❄️';
  if (d.includes('clear')) return '☀️';
  if (d.includes('few clouds')) return '🌤️';
  if (d.includes('scattered')) return '⛅';
  if (d.includes('cloud')) return '☁️';
  if (d.includes('mist') || d.includes('haze') || d.includes('fog')) return '🌫️';
  return '🌡️';
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function fetchWeather(lat, lon, name, key) {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${key}&units=metric`
  );
  const data = await res.json();
  const current = data.list[0];
  const score = getScore(current.pop, current.main.humidity, current.clouds.all);

  // Get one reading per day for forecast
  const forecast = [];
  const seen = new Set();
  for (const item of data.list) {
    const date = new Date(item.dt * 1000);
    const day = DAYS[date.getDay()];
    if (!seen.has(day) && forecast.length < 6) {
      seen.add(day);
      forecast.push({
        day,
        temp: Math.round(item.main.temp),
        emoji: getWeatherEmoji(item.weather[0].description),
      });
    }
  }

  return {
    name,
    temp: Math.round(current.main.temp),
    feelsLike: Math.round(current.main.feels_like),
    tempMax: Math.round(current.main.temp_max),
    tempMin: Math.round(current.main.temp_min),
    humidity: current.main.humidity,
    clouds: current.clouds.all,
    pop: Math.round(current.pop * 100),
    score,
    desc: current.weather[0].description,
    decision: getDecision(score),
    forecast,
    bg: getWeatherBg(current.weather[0].description),
    emoji: getWeatherEmoji(current.weather[0].description),
  };
}

function ForecastWave({ forecast }) {
  if (!forecast || forecast.length === 0) return null;
  const temps = forecast.map(f => f.temp);
  const min = Math.min(...temps) - 2;
  const max = Math.max(...temps) + 2;
  const W = 540, H = 80;
  const step = W / (temps.length - 1);

  function toY(t) {
    return H - ((t - min) / (max - min)) * (H - 20) - 5;
  }

  const points = temps.map((t, i) => [i * step + 30, toY(t)]);
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev[0] + curr[0]) / 2;
    path += ` C ${cpx} ${prev[1]}, ${cpx} ${curr[1]}, ${curr[0]} ${curr[1]}`;
  }

  return (
    <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', minWidth: '540px', padding: '0 30px', marginBottom: '4px' }}>
        {forecast.map((f, i) => (
          <div key={i} style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: '1.1rem' }}>{f.emoji}</div>
            <div style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>{f.temp}°</div>
          </div>
        ))}
      </div>
      <svg width="100%" viewBox={`0 0 600 ${H}`} style={{ minWidth: '540px' }}>
        <defs>
          <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={path + ` L ${points[points.length-1][0]} ${H} L ${points[0][0]} ${H} Z`}
          fill="url(#waveGrad)" />
        <path d={path} fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round"/>
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="4" fill="#60a5fa" />
        ))}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', minWidth: '540px', padding: '0 30px' }}>
        {forecast.map((f, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem' }}>{f.day}</div>
        ))}
      </div>
    </div>
  );
}

function WeatherCard({ w, onRemove, isMain }) {
  const [bg] = useState(w.bg);

  if (isMain) {
    return (
      <div style={{
        borderRadius: '24px', overflow: 'hidden', marginBottom: '1rem',
        background: `linear-gradient(135deg, ${bg[0]} 0%, ${bg[1]} 100%)`,
        border: '1px solid rgba(255,255,255,0.08)',
        position: 'relative',
      }}>
        {/* Atmospheric overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 70% 20%, rgba(96,165,250,0.08) 0%, transparent 60%)',
        }}/>

        <div style={{ padding: '2rem', position: 'relative' }}>
          {/* Top row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1rem' }}>📍</span>
                <span style={{ color: '#94a3b8', fontSize: '0.9rem', letterSpacing: '0.05em' }}>{w.name}</span>
              </div>
              <div style={{ color: '#fff', fontSize: '5rem', fontWeight: '300', lineHeight: 1, letterSpacing: '-0.03em' }}>
                {w.temp}°
              </div>
              <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
                H: {w.tempMax}°  L: {w.tempMin}°
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '4rem', lineHeight: 1 }}>{w.emoji}</div>
              <div style={{
                marginTop: '8px', display: 'inline-block',
                background: w.decision.bg, border: `1px solid ${w.decision.color}44`,
                borderRadius: '20px', padding: '4px 14px',
                color: w.decision.color, fontSize: '0.8rem', fontWeight: '700',
              }}>
                {w.decision.text}
              </div>
            </div>
          </div>

          {/* Weather description */}
          <div style={{
            marginTop: '1rem',
            color: '#e2e8f0', fontSize: '1.8rem', fontWeight: '300',
            textTransform: 'capitalize', lineHeight: 1.2,
          }}>
            {w.desc.split(' ').map((word, i) => (
              <span key={i}>{i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ' ' + word}</span>
            ))}
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            {[
              { label: 'Rain', val: `${w.pop}%`, icon: '🌧️' },
              { label: 'Humidity', val: `${w.humidity}%`, icon: '💧' },
              { label: 'Clouds', val: `${w.clouds}%`, icon: '☁️' },
              { label: 'Feels', val: `${w.feelsLike}°`, icon: '🌡️' },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px', padding: '10px 6px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1rem' }}>{s.icon}</div>
                <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '600', marginTop: '4px' }}>{s.val}</div>
                <div style={{ color: '#64748b', fontSize: '0.65rem', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Forecast wave */}
          <ForecastWave forecast={w.forecast} />
        </div>

        <button onClick={onRemove} style={{
          position: 'absolute', top: '1rem', right: '1rem',
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px', color: '#94a3b8', cursor: 'pointer',
          fontSize: '0.7rem', padding: '4px 8px',
        }}>✕</button>
      </div>
    );
  }

  // Compact card for secondary locations
  return (
    <div style={{
      borderRadius: '20px', padding: '1.25rem',
      background: `linear-gradient(135deg, ${bg[0]}cc, ${bg[1]}cc)`,
      border: '1px solid rgba(255,255,255,0.08)',
      marginBottom: '1rem', position: 'relative',
      backdropFilter: 'blur(20px)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            📍 {w.name}
          </p>
          <p style={{ color: '#fff', fontSize: '2.2rem', fontWeight: '300', margin: 0, lineHeight: 1 }}>{w.temp}°</p>
          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '4px 0 0', textTransform: 'capitalize' }}>{w.desc}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '2.5rem' }}>{w.emoji}</div>
          <div style={{
            marginTop: '6px', display: 'inline-block',
            background: w.decision.bg, borderRadius: '12px',
            padding: '3px 10px', color: w.decision.color,
            fontSize: '0.75rem', fontWeight: '700',
          }}>{w.decision.text}</div>
        </div>
      </div>
      <div style={{
        marginTop: '0.75rem', display: 'flex', gap: '0.75rem',
        color: '#64748b', fontSize: '0.78rem',
      }}>
        <span>🌧️ {w.pop}%</span>
        <span>💧 {w.humidity}%</span>
        <span>☁️ {w.clouds}%</span>
      </div>
      <button onClick={onRemove} style={{
        position: 'absolute', top: '0.75rem', right: '0.75rem',
        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '6px', color: '#475569', cursor: 'pointer',
        fontSize: '0.7rem', padding: '3px 7px',
      }}>✕</button>
    </div>
  );
}

export default function Home() {
  const [cards, setCards] = useState(() => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('umbrella-locations');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
});
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const key = process.env.NEXT_PUBLIC_OWM_KEY;
  useEffect(() => {
  localStorage.setItem('umbrella-locations', JSON.stringify(cards));
}, [cards]);

  async function handleSearch(e) {
    e.preventDefault();
    if (!search.trim()) return;
    setSearching(true);
    try {
      const geoRes = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(search)}&limit=1&appid=${key}`
      );
      const geo = await geoRes.json();
      if (!geo.length) {
        alert('Location not found! Try adding "Dhaka" — e.g. "Mirpur Dhaka"');
        setSearching(false); return;
      }
      const { lat, lon, name } = geo[0];
      const w = await fetchWeather(lat, lon, name, key);
      setCards(prev => [w, ...prev.filter(c => c.name !== w.name)]);
    } catch { alert('Error fetching location.'); }
    setSearching(false);
    setSearch('');
  }

  async function handleGPS() {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const w = await fetchWeather(latitude, longitude, '📍 My Location', key);
      setCards(prev => [w, ...prev.filter(c => c.name !== '📍 My Location')]);
      setGpsLoading(false);
    }, () => { alert('GPS access denied.'); setGpsLoading(false); });
  }

  function removeCard(name) {
    setCards(prev => prev.filter(c => c.name !== name));
  }

  const mainBg = cards.length > 0 ? cards[0].bg : ['#0f1923', '#1a2a3a'];

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0f1e; }
        input::placeholder { color: #334155; }
        input:focus { outline: none; border-color: #60a5fa !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>

      <main style={{
        minHeight: '100vh',
        background: cards.length > 0
          ? `linear-gradient(160deg, ${mainBg[0]} 0%, #0a0f1e 50%)`
          : 'linear-gradient(160deg, #0f1923 0%, #0a0f1e 100%)',
        fontFamily: "'Segoe UI', sans-serif",
        transition: 'background 1s ease',
        padding: '2rem 1rem',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            color: '#fff', fontSize: '1.6rem', fontWeight: '300',
            letterSpacing: '0.2em', textTransform: 'uppercase',
          }}>☂ UmbrellaNow</h1>
          <p style={{ color: '#334155', fontSize: '0.8rem', marginTop: '4px', letterSpacing: '0.1em' }}>
            HYPERLOCAL RAIN INTELLIGENCE
          </p>
        </div>

        {/* Search */}
        <div style={{ maxWidth: '600px', margin: '0 auto 1.5rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search area... e.g. Mirpur Dhaka"
              style={{
                flex: 1, padding: '0.8rem 1.2rem',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '14px', color: '#fff', fontSize: '0.9rem',
              }}
            />
            <button type="submit" disabled={searching} style={{
              padding: '0.8rem 1.4rem',
              background: searching ? '#1e293b' : 'rgba(96,165,250,0.2)',
              border: '1px solid rgba(96,165,250,0.3)',
              borderRadius: '14px', color: '#60a5fa',
              fontWeight: '600', cursor: 'pointer', fontSize: '0.9rem',
              letterSpacing: '0.05em',
            }}>
              {searching ? '...' : 'Search'}
            </button>
          </form>
          <button onClick={handleGPS} disabled={gpsLoading} style={{
            width: '100%', padding: '0.7rem',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px', color: '#475569',
            cursor: 'pointer', fontSize: '0.85rem', letterSpacing: '0.05em',
          }}>
            {gpsLoading ? '⌛ Getting location...' : '📡 Use My GPS Location'}
          </button>
        </div>

        {/* Cards */}
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {cards.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>☁️</div>
              <p style={{ color: '#1e293b', fontSize: '0.9rem', letterSpacing: '0.1em' }}>
                SEARCH A LOCATION TO BEGIN
              </p>
              <p style={{ color: '#1e293b', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                Tip: Add "Dhaka" after area name
              </p>
            </div>
          ) : (
            cards.map((w, i) => (
              <WeatherCard
                key={w.name}
                w={w}
                isMain={i === 0}
                onRemove={() => removeCard(w.name)}
              />
            ))
          )}
        </div>
      </main>
    </>
  );
}