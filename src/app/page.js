'use client';

import axios from 'axios';
import { useEffect, useState } from 'react';
import { FaBitcoin, FaLandmark, FaChartPie, FaStream, FaRocket, FaClock, FaHdd } from 'react-icons/fa';

import { Chart as ChartJS } from 'chart.js/auto';
import { Pie, Line } from 'react-chartjs-2';

/**
 * Utilities
 */

function getApiHost() {
  if (process.env.NODE_ENV === 'production') {
    return process.env.apiUrl;
  }
  return 'http://localhost:39393';
}

function replaceUndefined(v) {
  if (typeof v === 'undefined') {
    return '...';
  }
  return v;
}

function shortHashString(hash) {
  if (typeof hash === 'string') {
    return hash.substring(0, 4) + '...' + hash.substring(hash.length - 4);
  }
  return replaceUndefined(hash);
}

function calcMod(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    return [0, 0];
  }
  a = Math.floor(a);
  b = Math.floor(b);
  const r2 = a % b;
  const r1 = (r2 === 0 ? Math.floor(a / b) + 1 : Math.floor(a / b));
  return [r1, r2];
}

function makeDurationByHours(hours) {
  if (typeof hours != 'number') {
    return '...';
  }
  if (hours > 24) {
    return `${hours / 24} days`;
  }
  return `${hours} hours`;
}

function formatNumberString(n) {
  if (typeof n === 'number') {
    return n.toLocaleString();
  }
  return replaceUndefined(n);
}

function formatSeconds(secs) {
  if (typeof secs === 'undefined' || secs === null) {
    secs = 0;
  }
  let [m1, s] = calcMod(secs, 60);
  let [h, m] = calcMod(m1, 60);
  if (h > 0) {
    return `${h}:${m}:${s}`;
  } else {
    return `${m}:${s}`;
  }
}

function formatLocalTime(timestamp) {
  if (typeof timestamp === 'undefined' || timestamp === null) {
    return '...';
  }
  let the_time = new Date(timestamp * 1000);
  return the_time.toLocaleString('en-US');
}

/**
 * React status
 */

function useTimelordStatus() {
  const [status, setStatus] = useState();
  const query = () => {
    axios.get(getApiHost() + '/api/status?rn=' + Math.random()).then(function (res) {
      setStatus(res.data);
    });
  };
  return [status, query];
}

function useTimelordSummary(hours) {
  const [summary, setSummary] = useState();
  const query = () => {
    axios.get(getApiHost() + '/api/summary?hours=' + hours + '&rn=' + Math.random()).then(function (res) {
      setSummary(res.data);
    });
  };
  return [summary, query];
}

function useTimelordNetspace(hours) {
  const [netspace, setNetspace] = useState();
  const query = () => {
    axios.get(getApiHost() + '/api/netspace?hours=' + hours + '&rn=' + Math.random()).then(function (res) {
      setNetspace(res.data);
    });
  };
  return [netspace, query];
}

/**
 * Base components
 */

function SectionTitle({ Icon, title }) {
  return (
    <div className='flex flex-row py-2 lg:pt-4'>
      <Icon />
      <div className='font-bold text-xs italic pl-2'>{title}</div>
    </div>
  );
}

function StatusEntry({ name, value, error }) {
  let clsName = 'p-1 text-sm flex flex-row';
  if (error) {
    clsName = clsName + ' text-red-700';
  }
  return (
    <div className={clsName}>
      <div>{name}</div><div className='font-mono text-right grow'>{replaceUndefined(value)}</div>
    </div>
  )
}

function Description({ desc }) {
  return (
    <span className='line-clamp-2 text-xs text-gray-500'>{desc}</span>
  )
}

/**
 * Title and header
 */

function Title({ server_ip }) {
  return (
    <div className='flex flex-row p-2 bg-gray-300 lg:bg-inherit lg:flex-col lg:pt-8'>
      <div className='text-xl font-bold w-auto lg:self-center lg:text-3xl lg:pb-2'>BitcoinHD chain</div>
      <div className='text-xs text-right grow self-center'><span className='font-bold'>Timelord service</span>{' '}<span className='underline'>{server_ip}</span></div>
    </div>
  )
}

/**
 * Base status
 */

function StatusBase({ iters_per_sec, num_connections, status_string }) {
  return (
    <>
      <SectionTitle Icon={FaLandmark} title='Base' />
      <StatusEntry name='Version' value={'beta 0.1.0'} />
      <StatusEntry name='VDF speed' value={formatNumberString(iters_per_sec) + ' ips'} />
      <StatusEntry name='Connections' value={num_connections} />
      <StatusEntry name='Status' value={status_string} error={status_string !== 'good'} />
    </>
  )
}

function StatusArriving({ height, challenge, total_size, vdf_pack, num_connections }) {
  let requests = [];
  let timestamp = null;
  if (vdf_pack) {
    requests = vdf_pack.requests;
    timestamp = vdf_pack.timestamp;
  }
  let best = null;
  if (requests) {
    for (let req of requests) {
      if (best === null) {
        best = req;
      } else if (req.iters < best.iters) {
        best = req;
      }
    }
  }
  let estimated_seconds = 0;
  if (best) {
    estimated_seconds = best.estimated_seconds;
  };
  return (
    <>
      <SectionTitle Icon={FaRocket} title='Arriving' />
      <StatusEntry name='Incoming height' value={formatNumberString(height)} />
      <StatusEntry name='Challenge' value={shortHashString(challenge)} />
      <StatusEntry name='Netspace' value={formatNumberString(total_size)} />
      <SectionTitle Icon={FaClock} title='Next block' />
      <StatusEntry name='Estimated time' value={formatSeconds(estimated_seconds)} />
      <StatusEntry name='Number of answers' value={`${formatNumberString(requests.length)}/${formatNumberString(num_connections)}`} />
      <StatusEntry name='Previous block' value={formatLocalTime(timestamp)} />
      <StatusEntry name='Next block' value={formatLocalTime(timestamp ? timestamp + estimated_seconds : null)} />
    </>
  )
}

function StatusLastBlockInfo({ hash, height, address, reward, accumulate, filter_bits, vdf_time, vdf_iters, vdf_speed, challenge_difficulty, block_difficulty }) {
  return (
    <>
      <SectionTitle Icon={FaBitcoin} title='Last block' />
      <StatusEntry name='Hash' value={shortHashString(hash)} />
      <StatusEntry name='Height' value={formatNumberString(height)} />
      <StatusEntry name='Miner' value={address} />
      <StatusEntry name='Reward' value={replaceUndefined(reward) + ' BHD'} />
      <StatusEntry name='Accumulate' value={formatNumberString(accumulate) + ' BHD'} />
      <StatusEntry name='Filter-bit' value={filter_bits} />
      <StatusEntry name='VDF speed' value={formatNumberString(vdf_speed)} />
      <StatusEntry name='VDF time' value={vdf_time} />
      <StatusEntry name='VDF iterations' value={formatNumberString(vdf_iters)} />
      <StatusEntry name='Challenge difficulty' value={formatNumberString(challenge_difficulty)} />
      <StatusEntry name='Block difficulty' value={formatNumberString(block_difficulty)} />
    </>
  )
}

function Status({ challenge, height, iters_per_sec, total_size, num_connections, status_string, last_block_info, vdf_pack }) {
  return (
    <>
      <div className='lg:w-[400px]'>
        <StatusBase iters_per_sec={iters_per_sec} num_connections={num_connections} status_string={status_string} />
        <StatusArriving height={height} challenge={challenge} total_size={total_size} vdf_pack={vdf_pack} num_connections={num_connections} />
      </div>
      <div className='lg:w-[400px]'>
        <StatusLastBlockInfo {...last_block_info} />
      </div>
    </>
  )
}

/**
 * Summary
 */

function SummaryPie({ hours, summary }) {
  if (typeof summary === 'undefined') {
    return (
      <div />
    );
  }

  const data = {
    labels: [],
    datasets: [
      {
        label: 'Blocks',
        data: [],
        backgroundColor: [],
        borderColor: [],
        borderWidth: 0,
      },
    ],
  };

  const colors = [
    [70, 250, 70],
    [70, 220, 70],
    [70, 200, 70],
    [250, 70, 70],
  ];

  const colorWithAlpha = (color, alpha) => {
    return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;
  };

  for (let i = 0; i < summary.length; ++i) {
    const entry = summary[i];
    data.labels.push(`<${entry.min}m`);
    data.datasets[0].data.push(entry.count);
    data.datasets[0].backgroundColor.push(colorWithAlpha(colors[i], '0.7'));
  }

  const hours_str = makeDurationByHours(hours);
  return (
    <>
      <SectionTitle Icon={FaChartPie} title={'Blocks in ' + hours_str} />
      <Description desc={`The chart following shows the information of the blocks for the past ${hours_str}.`} />
      <Pie className='lg:mt-8 lg:p-8 lg:bg-gray-200 lg:rounded-2xl' data={data} />
    </>
  )
}

function SummaryStatus({ num_blocks, high_height, low_height, hours }) {
  const hours_str = makeDurationByHours(hours);
  return (
    <>
      <SectionTitle Icon={FaStream} title={'Summary in ' + hours_str} />
      <StatusEntry name='Total blocks' value={formatNumberString(num_blocks)} />
      <StatusEntry name='Time per block' value={formatNumberString(hours * 60 / num_blocks) + ' min'} />
      <StatusEntry name='Block range' value={formatNumberString(low_height) + ' ... ' + formatNumberString(high_height)} />
    </>
  )
}

function SummaryNetspace({ netspace }) {
  if (typeof netspace === 'undefined') {
    return (
      <div />
    );
  }
  const options = {
    responsive: true,
    plugins: {
      title: {
        display: false,
      },
    },
  };
  let labels = [];
  let data = {
    labels,
    datasets: [
      {
        label: 'Challenge difficulty',
        data: [],
        pointStyle: false,
        borderWidth: 1,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: 'Block difficulty',
        data: [],
        pointStyle: false,
        borderWidth: 1,
        borderColor: 'rgb(200, 200, 200)',
        backgroundColor: 'rgba(200, 200, 200, 0.5)',
      },
    ],
  };
  for (let i = 0; i < netspace.length; ++i) {
    const entry = netspace[i];
    labels.push(entry.height);
    data.datasets[0].data.push(entry.challenge_difficulty / 1000000000);
    data.datasets[1].data.push(entry.block_difficulty / 1000000000);
  }
  return (
    <>
      <SectionTitle Icon={FaHdd} title='Difficulty variation in 7 days (GB)' />
      <Line options={options} data={data} />
    </>
  );
}

function Summary({ num_blocks, high_height, low_height, hours, summary }) {
  return (
    <div className='lg:w-[400px]'>
      <SummaryStatus num_blocks={num_blocks} hours={hours} low_height={low_height} high_height={high_height} />
      <SummaryPie summary={summary} hours={hours} />
    </div>
  )
}

/**
 * Main
 */

export default function Home() {
  const [baseStatus, queryStatus] = useTimelordStatus();
  const [summary24, querySummary24] = useTimelordSummary(24);
  const [summary24_7, querySummary24_7] = useTimelordSummary(24 * 7);
  const [netspace, queryNetspace] = useTimelordNetspace(24 * 7);
  useEffect(() => {
    queryStatus();
    querySummary24();
    querySummary24_7();
    queryNetspace();
  }, []);
  return (
    <main className='flex flex-col items-center'>
      <div className='w-full bg-gray-100 lg:w-[1000px] lg:bg-gray-100'>
        <Title {...baseStatus} />
        <div className='p-3'>
          <div className='lg:flex lg:flex-row lg:justify-between lg:p-8 lg:bg-gray-50'>
            <Status {...baseStatus} />
          </div>
          <div className='lg:p-8'>
            <SummaryNetspace netspace={netspace} />
          </div>
          <div className='lg:flex lg:flex-row lg:justify-between lg:p-8'>
            <Summary {...summary24} />
            <Summary {...summary24_7} />
          </div>
        </div>
      </div>
    </main>
  );
}
