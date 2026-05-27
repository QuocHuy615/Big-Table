import type { CSSProperties, ReactElement } from 'react';
import type { BankData } from '../../interfaces/bank.interfaces';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const formatDate = (date: Date | undefined) => {
  return date?.toLocaleDateString('vi-VN'); 
};

interface RowProps {
  item?: BankData;
  style: CSSProperties;
}

function Row({ item, style }: RowProps): ReactElement {
  if (!item) {
    return <div style={style} className="table-row loading-row">Đang tải...</div>;
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({
    id: item.id
  });

  const combinedStyle = {
    ...style,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    transition,
    zIndex: transform ? 99 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      className="table-row"
      style={combinedStyle}
      {...attributes}
      {...listeners}
    >
      <div className="col">{item.id}</div>
      <div className="col">{formatDate(item.parsedDate)}</div>
      <div className="col">{item.Domain}</div>
      <div className="col">{item.Location}</div>
      <div className="col align-right">{item.Value?.toLocaleString()}</div>
      <div className="col align-right">{item.Transaction_count?.toLocaleString()}</div>
    </div>
  );
}

Row.displayName = 'Row';
export default Row;